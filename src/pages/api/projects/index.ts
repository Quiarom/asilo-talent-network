import type { APIRoute } from "astro";
import { json } from "../../../lib/http";
import { loadApprovedProjects } from "../../../lib/projects-loader";
import { createRateLimiter } from "../../../lib/rate-limit";

export const prerender = false;

const limited = createRateLimiter(60, 60_000);

// Public read-only feed. Served from the loader's 60 s cache: bypassing it
// would spend one Sheets read per request and exhaust the service-account
// quota (~60 reads/min) with a few visitors.
export const GET: APIRoute = async ({ clientAddress }) => {
  if (limited(clientAddress ?? "unknown")) {
    return json({ error: "Demasiadas solicitudes." }, 429, {
      "cache-control": "no-store",
      "retry-after": "60",
    });
  }

  const projects = await loadApprovedProjects();
  return json({ projects }, 200, {
    "cache-control": "public, max-age=15, s-maxage=15, stale-while-revalidate=30",
  });
};
