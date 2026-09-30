import {
  MAX_LIKES_PER_NETWORK,
  type EngagementStore,
  type PublicComment,
} from "./types";

type StoredComment = PublicComment & { projectId: string; ipHash: string; status: "pending" | "approved" };

/**
 * In-memory adapter with the same rules as the Appwrite one (one like per
 * voter, per-network cap, comments stored as pending). Backs unit tests and
 * the local demo mode; never used in production.
 */
export function createMemoryStore(seed: { comments?: Omit<StoredComment, "id">[] } = {}) {
  const likes = new Map<string, { projectId: string; ipHash: string }>();
  const comments: StoredComment[] = (seed.comments ?? []).map((c, i) => ({ ...c, id: `seed-${i}` }));
  const count = (projectId: string) =>
    [...likes.values()].filter((like) => like.projectId === projectId).length;

  const store: EngagementStore = {
    enabled: true,
    async likeCounts() {
      const counts = new Map<string, number>();
      for (const { projectId } of likes.values()) counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
      return counts;
    },
    async setLike({ projectId, voterHash, ipHash, liked }) {
      const key = `${projectId}:${voterHash}`;
      if (!liked) {
        likes.delete(key);
        return { liked: false, likes: count(projectId) };
      }
      const fromNetwork = [...likes.values()].filter((l) => l.projectId === projectId && l.ipHash === ipHash);
      if (!likes.has(key) && fromNetwork.length >= MAX_LIKES_PER_NETWORK) return { capped: true };
      likes.set(key, { projectId, ipHash });
      return { liked: true, likes: count(projectId) };
    },
    async approvedComments(projectId) {
      return comments
        .filter((c) => c.projectId === projectId && c.status === "approved")
        .map(({ id, author, body, createdAt }) => ({ id, author, body, createdAt }));
    },
    async submitComment(comment) {
      comments.push({ ...comment, id: String(comments.length), status: "pending", createdAt: new Date().toISOString() });
    },
  };
  return { store, likes, comments };
}
