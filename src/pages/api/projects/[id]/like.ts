/**
 * `POST /api/projects/:id/like` with `{ "liked": boolean }`.
 *
 * No accounts, so a "voter" is an HttpOnly random cookie. Layers, from
 * cheapest to strongest:
 *   1. same-origin JSON only (CSRF: cross-site pages can't forge it);
 *   2. per-IP rate limit (in-process, slows scripted loops);
 *   3. only approved project ids are accepted;
 *   4. one like per voter per project (deterministic row id, idempotent);
 *   5. at most MAX_LIKES_PER_NETWORK likes per project per IP, stored as a
 *      keyed hash — clearing cookies does not mint unlimited votes.
 * Likes only reorder "Más votados"; that impact is low enough to not need a
 * captcha on every click.
 */

import type { APIRoute } from "astro";
import { findProject, resetDirectoryCache } from "../../../../lib/directory";
import { getEngagementStore, privateHash } from "../../../../lib/engagement";
import { isSameOriginJson, json } from "../../../../lib/http";
import { createRateLimiter } from "../../../../lib/rate-limit";

export const prerender = false;

const VOTER_COOKIE = "ab_voter";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROJECT_ID = /^[0-9a-f]{12}$/;

const limited = createRateLimiter(30, 10 * 60_000);
const noStore = { "cache-control": "no-store" };

export const POST: APIRoute = async ({ params, request, cookies, clientAddress }) => {
  if (!isSameOriginJson(request)) {
    return json({ ok: false, error: "Solicitud inválida." }, 403, noStore);
  }

  const store = getEngagementStore();
  if (!store.enabled) {
    return json({ ok: false, error: "Los votos no están disponibles ahora." }, 503, noStore);
  }

  const ip = clientAddress ?? "unknown";
  if (limited(ip)) {
    return json(
      { ok: false, error: "Demasiados votos seguidos. Probá en unos minutos." },
      429,
      { ...noStore, "retry-after": "600" },
    );
  }

  const body = (await request.json().catch(() => null)) as { liked?: unknown } | null;
  if (typeof body?.liked !== "boolean") {
    return json({ ok: false, error: "Solicitud inválida." }, 400, noStore);
  }

  const projectId = params.id ?? "";
  if (!PROJECT_ID.test(projectId) || !(await findProject(projectId))) {
    return json({ ok: false, error: "Proyecto no encontrado." }, 404, noStore);
  }

  let voter = cookies.get(VOTER_COOKIE)?.value ?? "";
  if (!UUID.test(voter)) {
    voter = crypto.randomUUID();
    cookies.set(VOTER_COOKIE, voter, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  try {
    const result = await store.setLike({
      projectId,
      voterHash: privateHash("voter", voter),
      ipHash: privateHash("ip", ip),
      liked: body.liked,
    });
    if ("capped" in result) {
      return json(
        { ok: false, error: "Se alcanzó el límite de votos desde esta red para este proyecto." },
        429,
        noStore,
      );
    }
    // This instance re-reads counts on the next render so the ranking moves.
    resetDirectoryCache();
    return json({ ok: true, ...result }, 200, noStore);
  } catch {
    console.error("[like] store write failed");
    return json({ ok: false, error: "No se pudo registrar tu voto. Intentá de nuevo." }, 503, noStore);
  }
};
