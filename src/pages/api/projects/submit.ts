/**
 * Public project-submission endpoint — no auth by design.
 *
 * Two modes share every anti-abuse layer:
 * - `create` (default): a new project; rejected when the website exists.
 * - `edit`: a change request for a PUBLISHED project (matched by website).
 *   It appends a new `PENDIENTE` revision instead of touching the live row;
 *   once approved, the loader serves it as the latest revision. The previous
 *   logo is carried over when no new one is uploaded, and the requester's
 *   contact goes into "Notas adicionales" so the team can verify ownership.
 *
 * Validates untrusted form input server-side, quarantines it as a `PENDIENTE`
 * row (private sheet) and answers with JSON. Anti-abuse is in-process and
 * minimal: honeypot, min-time-to-fill, per-IP sliding-window rate limit and an
 * idempotency check against the existing `Sitio web` column. Fail-closed:
 * without sheet credentials nothing is written and every request gets a 503.
 *
 * Same-origin form POSTs pass Astro's default `security.checkOrigin` — the
 * modal always fetches the current origin, so checkOrigin stays enabled.
 *
 * Environment (names only — values live in the deployed runtime):
 *   GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
 *   GOOGLE_SHEETS_RANGE (optional, default "Projects!A1:J"),
 *   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY (optional —
 *   logo upload; without them the logo is skipped and the project still submits),
 *   TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY (optional — captcha; without them
 *   the captcha is skipped and the other anti-abuse layers still apply)
 */

import type { APIContext } from "astro";
import googleSheets from "@googleapis/sheets";
import { Client, ID, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import {
  buildRow,
  findDuplicateWebsite,
  findLatestApprovedRevision,
  MIN_FILL_MS,
  validateContact,
  validateSubmission,
} from "../../../lib/projects-submit";
import { json } from "../../../lib/http";
import { createRateLimiter } from "../../../lib/rate-limit";
import { LOGO_BUCKET_ID, validateLogo } from "../../../lib/projects-logo";
import {
  turnstileConfigured,
  verifyTurnstile,
} from "../../../lib/turnstile";

export const prerender = false;

// Write scope: appending rows needs spreadsheet write access (the read path
// uses the readonly scope; this one can read and write).
const WRITE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEET_RANGE = import.meta.env.GOOGLE_SHEETS_RANGE ?? "Projects!A1:J";
// Anchor the table, not a row: Sheets detects its end and appends automatically.
const APPEND_RANGE = "Projects!A1";

// ponytail: per-process sliding window (see lib/rate-limit.ts).
const rateLimited = createRateLimiter(5, 10 * 60_000);

export async function POST({ request, clientAddress }: APIContext) {
  // Fail-closed: no credentials, no writes.
  if (
    !import.meta.env.GOOGLE_SHEETS_ID ||
    !import.meta.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  ) {
    return json(
      { ok: false, error: "El directorio no está disponible en este momento." },
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Solicitud inválida." }, 400);
  }

  // Honeypot: bots fill the hidden field; answer success-shaped but write nothing.
  const honeypot = form.get("contact_email");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return json({ ok: true }, 201);
  }

  // Captcha (Turnstile): when keys are configured, a token must be present and
  // verify server-side before anything else is checked. Tokens are single-use;
  // the widget refills the hidden `cf-turnstile-response` input on each solve.
  if (turnstileConfigured()) {
    const token = form.get("cf-turnstile-response");
    if (typeof token !== "string" || token.trim() === "") {
      return json(
        {
          ok: false,
          field: "captcha",
          error: "Completá la verificación para enviar.",
        },
        400,
      );
    }
    if (!(await verifyTurnstile(token, import.meta.env.TURNSTILE_SECRET_KEY))) {
      return json(
        {
          ok: false,
          field: "captcha",
          error: "La verificación falló. Recargá e intentá de nuevo.",
        },
        403,
      );
    }
  }
  // ponytail: captcha is fail-open when TURNSTILE_* are unset so local/dev
  // submits keep working; honeypot, min-time, rate limit and dedupe still
  // apply. Production MUST set both Turnstile env vars.

  // Min-time-to-fill: the form ships the server render time; sub-3s fills are
  // bots. A missing/unparsable timestamp is treated as too fast, never trusted.
  const submittedAtRaw = form.get("submitted_at");
  const submittedAt =
    typeof submittedAtRaw === "string" ? Number(submittedAtRaw) : Number.NaN;
  if (!Number.isFinite(submittedAt) || Date.now() - submittedAt < MIN_FILL_MS) {
    return json(
      { ok: false, error: "El envío fue demasiado rápido. Intentá de nuevo." },
      429,
    );
  }

  if (rateLimited(clientAddress ?? "unknown")) {
    return json(
      {
        ok: false,
        error: "Demasiados envíos desde esta conexión. Intentá más tarde.",
      },
      429,
    );
  }

  const mode = form.get("mode") === "edit" ? "edit" : "create";
  let contact: string | null = null;
  if (mode === "edit") {
    contact = validateContact(String(form.get("contacto") ?? ""));
    if (!contact) {
      return json(
        { ok: false, field: "contacto", error: "Déjanos un email o @usuario (3 a 120 caracteres)." },
        400,
      );
    }
  }

  const validation = validateSubmission({
    nombre: String(form.get("nombre") ?? ""),
    website: String(form.get("website") ?? ""),
    descripcion: String(form.get("descripcion") ?? ""),
    fundadores: String(form.get("fundadores") ?? ""),
    categorias: form.getAll("categorias").map(String),
  });
  if (!validation.ok) {
    return json(
      { ok: false, field: validation.field, error: validation.message },
      400,
    );
  }

  // Optional logo: validate, then upload to Appwrite Storage when configured.
  // Fail-open on missing config (submit without a logo), fail-closed on a
  // configured upload error (never silently drop the user's file).
  const logoRaw = form.get("logo");
  // FormData returns an empty File for an untouched file input.
  const logo = logoRaw instanceof File && logoRaw.name !== "" ? logoRaw : null;
  const logoCheck = validateLogo(logo);
  if (!logoCheck.ok) {
    return json({ ok: false, field: "logo", error: logoCheck.error }, 400);
  }
  let logoId: string | undefined;
  if (
    logo &&
    import.meta.env.APPWRITE_ENDPOINT &&
    import.meta.env.APPWRITE_PROJECT_ID &&
    import.meta.env.APPWRITE_API_KEY
  ) {
    try {
      const appwrite = new Client()
        .setEndpoint(import.meta.env.APPWRITE_ENDPOINT)
        .setProject(import.meta.env.APPWRITE_PROJECT_ID)
        .setKey(import.meta.env.APPWRITE_API_KEY);
      const storage = new Storage(appwrite);
      const uploaded = await storage.createFile({
        bucketId: LOGO_BUCKET_ID,
        fileId: ID.unique(),
        file: InputFile.fromBuffer(Buffer.from(await logo.arrayBuffer()), logo.name),
        // Public directory: logos must be anonymously readable. `fileSecurity`
        // is disabled on the bucket so this file-level ACL (not the bucket
        // default) is what the view endpoint resolves.
        permissions: [Permission.read(Role.any())],
      });
      logoId = uploaded.$id;
    } catch {
      return json(
        {
          ok: false,
          error: "No se pudo subir el logo. Intentá de nuevo en unos minutos.",
        },
        503,
      );
    }
  }

  const serviceAccount = JSON.parse(
    Buffer.from(
      import.meta.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64!,
      "base64",
    ).toString("utf8"),
  ) as { client_email: string; private_key: string };

  const auth = new googleSheets.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [WRITE_SCOPE],
  });
  const sheets = googleSheets.sheets({ version: "v4", auth });

  // Idempotency: reject when the same normalized website already exists in the
  // sheet (pending OR approved) — same project, same row, never duplicated.
  // Edit requests are the opposite: the website MUST belong to a published
  // project, and they carry its current logo forward.
  // DEV-ONLY OVERRIDE: when `DEV_ALLOW_DUPLICATE_WEBSITE` is set to a truthy
  // value ("1"/"true"/"yes") in `.env.local`, the dedupe is skipped so a
  // developer can re-test submissions against the same project. Never set
  // this in production: it bypasses the "no duplicate project" guarantee.
  const devOverride =
    import.meta.env.DEV &&
    ["1", "true", "yes"].includes(
      String(import.meta.env.DEV_ALLOW_DUPLICATE_WEBSITE ?? "").toLowerCase(),
    );
  let notes: string | undefined;
  if (mode === "edit" || !devOverride) {
    let values: string[][];
    try {
      const { data } = await sheets.spreadsheets.values.get({
        spreadsheetId: import.meta.env.GOOGLE_SHEETS_ID!,
        range: SHEET_RANGE,
      });
      values = data.values ?? [];
    } catch {
      return json(
        {
          ok: false,
          error: "No se pudo verificar el envío. Intentá de nuevo en unos minutos.",
        },
        503,
      );
    }

    if (mode === "edit") {
      const current = findLatestApprovedRevision(values, validation.value.website);
      if (!current) {
        return json(
          { ok: false, error: "No encontramos un proyecto publicado con ese sitio web." },
          404,
        );
      }
      logoId ??= current.logoId || undefined;
      notes = `Solicitud de edición de ${current.revisionId || "la revisión publicada"} · Contacto: ${contact}`;
    } else if (findDuplicateWebsite(values, validation.value.website)) {
      return json(
        { ok: false, error: "Este proyecto ya fue enviado al directorio. Si es tuyo, abre su página y usa «Solicita cambios»." },
        409,
      );
    }
  }

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: import.meta.env.GOOGLE_SHEETS_ID!,
      range: APPEND_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [buildRow(validation.value, { logoId, notes })] },
    });
  } catch {
    return json(
      {
        ok: false,
        error: "No se pudo guardar tu proyecto. Intentá de nuevo en unos minutos.",
      },
      503,
    );
  }

  return json({ ok: true }, 201);
}
