/**
 * Application service for the "Proyectos" directory: combines the approved
 * projects (Google Sheet) with like counts (engagement store) and sorts them.
 * Pages, the refresh partial and the JSON API all go through here, so there
 * is exactly one definition of "what the directory shows".
 */

import type { Project } from "../data/projects";
import { getEngagementStore } from "./engagement";
import type { PublicComment } from "./engagement/types";
import { loadApprovedProjects } from "./projects-loader";
import { parseSortMode, sortProjects, type SortMode } from "./project-sort";

// Counts are cheap to read but the homepage is hot; a few seconds of
// staleness is invisible next to the 60 s sheet cache.
const COUNTS_TTL_MS = import.meta.env.MODE === "development" ? 0 : 10_000;
let counts: { at: number; value: Map<string, number> } | null = null;

/** Test hook. */
export function resetDirectoryCache(): void {
  counts = null;
}

async function likeCounts(): Promise<Map<string, number> | null> {
  const store = getEngagementStore();
  if (!store.enabled) return null;
  if (counts && Date.now() - counts.at < COUNTS_TTL_MS) return counts.value;
  try {
    counts = { at: Date.now(), value: await store.likeCounts() };
    return counts.value;
  } catch {
    console.error("[directory] like counts unavailable; serving last known counts.");
    return counts?.value ?? null;
  }
}

/** Whether likes and comments are available (and so the "Más votados" order). */
export function engagementEnabled(): boolean {
  return getEngagementStore().enabled;
}

/** `?orden=` → sort mode; "populares" falls back to A–Z when likes are off. */
export function resolveSort(raw: string | null | undefined): SortMode {
  const sort = parseSortMode(raw);
  return sort === "populares" && !engagementEnabled() ? "az" : sort;
}

function withLikes(project: Project, likes: Map<string, number> | null): Project {
  return likes && project.id ? { ...project, likes: likes.get(project.id) ?? 0 } : project;
}

/** Approved projects with like counts (when enabled), in the requested order. */
export async function loadDirectory(sort: SortMode): Promise<Project[]> {
  const [projects, likes] = await Promise.all([loadApprovedProjects(), likeCounts()]);
  return sortProjects(projects.map((project) => withLikes(project, likes)), sort);
}

/** One approved project by public id, or `null`. */
export async function findProject(id: string): Promise<Project | null> {
  const projects = await loadApprovedProjects();
  return projects.find((project) => project.id === id) ?? null;
}

/**
 * Everything the detail page shows. Engagement is optional: if the store is
 * down the project still renders, without likes and comments.
 */
export async function loadProjectPage(
  id: string,
): Promise<{ project: Project; comments: PublicComment[] } | null> {
  const project = await findProject(id);
  if (!project) return null;

  const store = getEngagementStore();
  if (!store.enabled) return { project, comments: [] };
  try {
    const [likes, comments] = await Promise.all([likeCounts(), store.approvedComments(id)]);
    return { project: withLikes(project, likes), comments };
  } catch {
    console.error("[directory] comments unavailable for project page");
    return { project: withLikes(project, counts?.value ?? null), comments: [] };
  }
}
