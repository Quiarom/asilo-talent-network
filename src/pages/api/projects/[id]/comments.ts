/**
 * `POST /api/projects/:id/comments` (multipart form from the detail page).
 *
 * Comments are free text on a public page with no accounts, i.e. the most
 * attractive spam target on the site. Defense in depth, same toolbox as the
 * project submit: honeypot, min-time-to-fill, Turnstile (when configured),
 * per-IP rate limit, strict validation (≤1 link) and — the layer that
 * actually guarantees nothing bad is shown — pre-moderation: every comment is
 * stored as `pending` and only `approved` rows are rendered.
 * Same-origin form POSTs are covered by Astro's `checkOrigin`.
 */

import type { APIRoute } from "astro";
import { findProject } from "../../../../lib/directory";
import { getEngagementStore, privateHash } from "../../../../lib/engagement";
import { validateComment } from "../../../../lib/engagement/comments";
import { json } from "../../../../lib/http";
import { MIN_FILL_MS } from "../../../../lib/projects-submit";
import { createRateLimiter } from "../../../../lib/rate-limit";
import { checkTurnstile } from "../../../../lib/turnstile";

export const prerender = false;

const PROJECT_ID = /^[0-9a-f]{12}$/;
const limited = createRateLimiter(3, 10 * 60_000);

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  const store = getEngagementStore();
  if (!store.enabled) {
    return json({ ok: false, error: "Los comentarios no están disponibles ahora." }, 503);
  }

  const projectId = params.id ?? "";
  if (!PROJECT_ID.test(projectId)) {
    return json({ ok: false, error: "Proyecto no encontrado." }, 404);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Solicitud inválida." }, 400);
  }

  // Honeypot: success-shaped answer, nothing stored.
  const honeypot = form.get("contact_email");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return json({ ok: true }, 201);
  }

  const captcha = await checkTurnstile(form);
  if (captcha) return json({ ok: false, field: "captcha", error: captcha.error }, captcha.status);

  const renderedAt = Number(form.get("submitted_at"));
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < MIN_FILL_MS) {
    return json({ ok: false, error: "El envío fue demasiado rápido. Intentá de nuevo." }, 429);
  }

  const ip = clientAddress ?? "unknown";
  if (limited(ip)) {
    return json({ ok: false, error: "Demasiados comentarios desde esta conexión. Intentá más tarde." }, 429);
  }

  const validation = validateComment({
    autor: String(form.get("autor") ?? ""),
    comentario: String(form.get("comentario") ?? ""),
  });
  if (!validation.ok) {
    return json({ ok: false, field: validation.field, error: validation.message }, 400);
  }

  if (!(await findProject(projectId))) {
    return json({ ok: false, error: "Proyecto no encontrado." }, 404);
  }

  try {
    await store.submitComment({
      projectId,
      author: validation.value.author,
      body: validation.value.body,
      ipHash: privateHash("ip", ip),
    });
  } catch {
    console.error("[comments] store write failed");
    return json({ ok: false, error: "No se pudo enviar tu comentario. Intentá de nuevo." }, 503);
  }
  return json({ ok: true }, 201);
};
