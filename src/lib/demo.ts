/**
 * `DEMO_DATA=1 pnpm dev` runs the whole site on fictional data: a fake sheet
 * through the real parser and an in-memory engagement store. It lets anyone
 * work on the UI without credentials and gives e2e tests a deterministic,
 * production-free backend. Dev server only — ignored in production builds.
 */
import { DEMO_COMMENTS, DEMO_SHEET } from "../data/demo-sheet";
import { createMemoryStore } from "./engagement/memory-store";
import type { EngagementStore } from "./engagement/types";
import { projectIdFor } from "./project-identity";

export function demoMode(): boolean {
  return import.meta.env.DEV && ["1", "true"].includes(String(import.meta.env.DEMO_DATA ?? ""));
}

export const demoSheet = (): string[][] => DEMO_SHEET;

let store: EngagementStore | null = null;
export function demoEngagementStore(): EngagementStore {
  store ??= createMemoryStore({
    comments: DEMO_COMMENTS.map(({ site, ...comment }) => ({
      ...comment,
      projectId: projectIdFor(site),
      ipHash: "demo",
      status: "approved",
    })),
  }).store;
  return store;
}
