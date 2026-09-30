import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as like } from "../src/pages/api/projects/[id]/like";
import { POST as comment } from "../src/pages/api/projects/[id]/comments";
import { setEngagementStoreForTests } from "../src/lib/engagement";
import { resetDirectoryCache } from "../src/lib/directory";
import { createMemoryStore } from "../src/lib/engagement/memory-store";

// Pretend the sheet publishes exactly one project.
const PROJECT = {
  href: "https://panapay.com",
  title: "Pana Pay",
  description: "Pagos",
  author: "Ana",
  tags: ["Fintech"],
  id: "0123456789ab",
  slug: "pana-pay-0123456789ab",
};
vi.mock("../src/lib/projects-loader", () => ({
  loadApprovedProjects: async () => [PROJECT],
}));

type Ctx = Parameters<typeof like>[0];

function cookieJar(initial?: string) {
  let value = initial;
  return {
    get: (name: string) => (name === "ab_voter" && value ? { value } : undefined),
    set: (_name: string, next: string) => { value = next; },
    current: () => value,
  };
}

function likeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://builders.test/api/projects/0123456789ab/like", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://builders.test", ...headers },
    body: JSON.stringify(body),
  });
}

function likeCtx(request: Request, cookies: ReturnType<typeof cookieJar>, ip = "203.0.113.1", id = PROJECT.id) {
  return { params: { id }, request, cookies, clientAddress: ip } as unknown as Ctx;
}

let fake: ReturnType<typeof createMemoryStore>;
beforeEach(() => {
  fake = createMemoryStore();
  setEngagementStoreForTests(fake.store);
  resetDirectoryCache();
});
afterEach(() => setEngagementStoreForTests(null));

describe("POST /api/projects/:id/like", () => {
  it("likes once per voter cookie and unlikes idempotently", async () => {
    const jar = cookieJar();
    const first = await like(likeCtx(likeRequest({ liked: true }), jar, "203.0.113.10"));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ ok: true, liked: true, likes: 1 });
    expect(jar.current()).toMatch(/^[0-9a-f-]{36}$/);

    const again = await like(likeCtx(likeRequest({ liked: true }), jar, "203.0.113.10"));
    expect(await again.json()).toMatchObject({ liked: true, likes: 1 });

    const unlike = await like(likeCtx(likeRequest({ liked: false }), jar, "203.0.113.10"));
    expect(await unlike.json()).toMatchObject({ liked: false, likes: 0 });
  });

  it("caps likes per network so clearing cookies doesn't mint votes", async () => {
    const ip = "203.0.113.20";
    for (let i = 0; i < 5; i += 1) {
      const res = await like(likeCtx(likeRequest({ liked: true }), cookieJar(), ip));
      expect(res.status).toBe(200);
    }
    const capped = await like(likeCtx(likeRequest({ liked: true }), cookieJar(), ip));
    expect(capped.status).toBe(429);
    expect(fake.likes.size).toBe(5);
  });

  it("rejects cross-site and non-JSON requests (CSRF)", async () => {
    const cross = await like(likeCtx(likeRequest({ liked: true }, { origin: "https://evil.test" }), cookieJar(), "203.0.113.30"));
    expect(cross.status).toBe(403);
    const form = await like(likeCtx(likeRequest({ liked: true }, { "content-type": "text/plain" }), cookieJar(), "203.0.113.30"));
    expect(form.status).toBe(403);
    expect(fake.likes.size).toBe(0);
  });

  it("only accepts published project ids and boolean bodies", async () => {
    const unknown = await like(likeCtx(likeRequest({ liked: true }), cookieJar(), "203.0.113.40", "ffffffffffff"));
    expect(unknown.status).toBe(404);
    const junk = await like(likeCtx(likeRequest({ liked: "yes" }), cookieJar(), "203.0.113.40"));
    expect(junk.status).toBe(400);
  });

  it("answers 503 when likes are not configured", async () => {
    setEngagementStoreForTests(null);
    const res = await like(likeCtx(likeRequest({ liked: true }), cookieJar(), "203.0.113.50"));
    expect(res.status).toBe(503);
  });
});

function commentCtx(fields: Record<string, string>, ip: string) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const request = new Request("https://builders.test/api/projects/0123456789ab/comments", {
    method: "POST",
    body: form,
  });
  return { params: { id: PROJECT.id }, request, clientAddress: ip } as unknown as Parameters<typeof comment>[0];
}

const valid = () => ({
  autor: "María",
  comentario: "¡Muy buena idea! ¿Tienen app móvil?",
  submitted_at: String(Date.now() - 10_000),
});

describe("POST /api/projects/:id/comments", () => {
  it("stores valid comments as pending, never published directly", async () => {
    const res = await comment(commentCtx(valid(), "198.51.100.1"));
    expect(res.status).toBe(201);
    expect(fake.comments).toHaveLength(1);
    expect(fake.comments[0]).toMatchObject({ status: "pending", author: "María" });
    expect(fake.comments[0].ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await fake.store.approvedComments(PROJECT.id)).toEqual([]);
  });

  it("fakes success for the honeypot and stores nothing", async () => {
    const res = await comment(commentCtx({ ...valid(), contact_email: "bot@spam.test" }, "198.51.100.2"));
    expect(res.status).toBe(201);
    expect(fake.comments).toHaveLength(0);
  });

  it("rejects instant submissions and link spam", async () => {
    const fast = await comment(commentCtx({ ...valid(), submitted_at: String(Date.now()) }, "198.51.100.3"));
    expect(fast.status).toBe(429);
    const spam = await comment(commentCtx({ ...valid(), comentario: "compra en https://a.ru y https://b.ru" }, "198.51.100.3"));
    expect(spam.status).toBe(400);
    expect(await spam.json()).toMatchObject({ field: "comentario" });
    expect(fake.comments).toHaveLength(0);
  });

  it("rate-limits one connection to three comments per window", async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await comment(commentCtx(valid(), "198.51.100.4"))).status).toBe(201);
    }
    expect((await comment(commentCtx(valid(), "198.51.100.4"))).status).toBe(429);
  });
});
