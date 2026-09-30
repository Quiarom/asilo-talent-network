/**
 * Port for likes and comments (hexagonal / "ports & adapters").
 *
 * Endpoints and pages depend on this interface only; `appwrite-store.ts` is
 * the production adapter and tests plug in an in-memory fake. Swapping the
 * backend later (Postgres, Supabase, a Backoffice API) touches one file.
 */

export type CommentStatus = "pending" | "approved" | "rejected";

export type PublicComment = {
  id: string;
  author: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
};

export type NewComment = {
  projectId: string;
  author: string;
  body: string;
  /** Keyed hash of the client IP, for abuse review; never the raw IP. */
  ipHash: string;
};

export type LikeResult = { liked: boolean; likes: number };

export interface EngagementStore {
  /** False when the backend is not configured: the UI hides likes/comments. */
  readonly enabled: boolean;
  /** Like counts keyed by project id; projects without likes are absent. */
  likeCounts(): Promise<Map<string, number>>;
  /**
   * Idempotently sets one voter's like on one project and returns the new
   * state. `ipHash` backs the per-network cap (see `MAX_LIKES_PER_NETWORK`).
   */
  setLike(input: {
    projectId: string;
    voterHash: string;
    ipHash: string;
    liked: boolean;
  }): Promise<LikeResult | { capped: true }>;
  /** Approved comments for one project, oldest first. */
  approvedComments(projectId: string): Promise<PublicComment[]>;
  /** Stores a comment as `pending`: nothing is public until moderated. */
  submitComment(comment: NewComment): Promise<void>;
}

/**
 * Venezuelan ISPs put many households behind one IP (CGNAT), so a strict
 * one-like-per-IP rule would lock out real people. Five likes per project per
 * network is loose for humans and tight for a single spammer.
 */
export const MAX_LIKES_PER_NETWORK = 5;
