/** JSON response with the charset the existing endpoints already use. */
export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

/**
 * CSRF guard for JSON endpoints Astro's `checkOrigin` does not cover (it only
 * inspects form content types). Requiring `application/json` forces a CORS
 * preflight for cross-site callers, and a present `Origin` must match.
 */
export function isSameOriginJson(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return false;
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
