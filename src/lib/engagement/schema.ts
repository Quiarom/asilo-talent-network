/**
 * Appwrite TablesDB layout for likes and comments. Shared by the runtime
 * adapter and `scripts/setup-appwrite.mjs` (which mirrors these names), so the
 * schema is declared once and created as code, not by clicking in a console.
 */

export const DEFAULT_DATABASE_ID = "builders";

export const TABLES = {
  /** One row per project (row id = project id): denormalized counters. */
  stats: "project_stats",
  /** One row per (project, voter) (row id = hash of both): the source of truth. */
  likes: "project_likes",
  /** Moderated comments; only `approved` rows are ever rendered. */
  comments: "project_comments",
} as const;
