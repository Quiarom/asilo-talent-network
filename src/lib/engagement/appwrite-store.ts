import { createHash } from "node:crypto";
import { AppwriteException, Client, ID, Query, TablesDB } from "node-appwrite";
import { TABLES } from "./schema";
import {
  MAX_LIKES_PER_NETWORK,
  type EngagementStore,
  type LikeResult,
  type PublicComment,
} from "./types";

type Config = {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
};

const isCode = (error: unknown, code: number) =>
  error instanceof AppwriteException && error.code === code;

/** Deterministic row id: the unique (project, voter) pair IS the primary key. */
const likeRowId = (projectId: string, voterHash: string) =>
  createHash("sha256").update(`${projectId}:${voterHash}`).digest("hex").slice(0, 32);

/**
 * Appwrite adapter. Uniqueness of a like is enforced by its deterministic row
 * id (a second create answers 409), and the per-project counter is updated
 * with Appwrite's atomic increment/decrement, so concurrent likes never lose
 * updates. The counter is denormalized for cheap ranking; `project_likes`
 * stays the source of truth if it ever needs recounting.
 */
export function createAppwriteStore(config: Config): EngagementStore {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);
  const db = new TablesDB(client);
  const databaseId = config.databaseId;

  async function currentLikes(projectId: string): Promise<number> {
    try {
      const row = await db.getRow({ databaseId, tableId: TABLES.stats, rowId: projectId });
      return Number(row.likes ?? 0);
    } catch (error) {
      if (isCode(error, 404)) return 0;
      throw error;
    }
  }

  async function increment(projectId: string): Promise<number> {
    try {
      const row = await db.incrementRowColumn({ databaseId, tableId: TABLES.stats, rowId: projectId, column: "likes", value: 1 });
      return Number(row.likes ?? 0);
    } catch (error) {
      if (!isCode(error, 404)) throw error;
    }
    // First like of this project: create its counter row.
    try {
      await db.createRow({ databaseId, tableId: TABLES.stats, rowId: projectId, data: { likes: 1 } });
      return 1;
    } catch (error) {
      // A concurrent first like created it: increment instead.
      if (isCode(error, 409)) return increment(projectId);
      throw error;
    }
  }

  async function decrement(projectId: string): Promise<number> {
    try {
      const row = await db.decrementRowColumn({ databaseId, tableId: TABLES.stats, rowId: projectId, column: "likes", value: 1, min: 0 });
      return Number(row.likes ?? 0);
    } catch {
      // Missing row or already at 0: the counter drifted from project_likes.
      // Report what is stored rather than failing the visitor's click.
      return currentLikes(projectId);
    }
  }

  return {
    enabled: true,

    async likeCounts() {
      const counts = new Map<string, number>();
      let cursor: string | undefined;
      // Paginate: the directory is small, but never silently truncate.
      for (;;) {
        const page = await db.listRows({
          databaseId,
          tableId: TABLES.stats,
          queries: [Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
          total: false,
        });
        for (const row of page.rows) counts.set(row.$id, Number(row.likes ?? 0));
        if (page.rows.length < 500) return counts;
        cursor = page.rows[page.rows.length - 1].$id;
      }
    },

    async setLike({ projectId, voterHash, ipHash, liked }): Promise<LikeResult | { capped: true }> {
      const rowId = likeRowId(projectId, voterHash);

      if (!liked) {
        try {
          await db.deleteRow({ databaseId, tableId: TABLES.likes, rowId });
        } catch (error) {
          if (isCode(error, 404)) return { liked: false, likes: await currentLikes(projectId) };
          throw error;
        }
        return { liked: false, likes: await decrement(projectId) };
      }

      const fromNetwork = await db.listRows({
        databaseId,
        tableId: TABLES.likes,
        queries: [
          Query.equal("projectId", projectId),
          Query.equal("ipHash", ipHash),
          Query.limit(MAX_LIKES_PER_NETWORK),
        ],
      });
      if (fromNetwork.total >= MAX_LIKES_PER_NETWORK) {
        const alreadyMine = fromNetwork.rows.some((row) => row.$id === rowId);
        if (!alreadyMine) return { capped: true };
      }

      try {
        await db.createRow({
          databaseId,
          tableId: TABLES.likes,
          rowId,
          data: { projectId, voter: voterHash, ipHash },
        });
      } catch (error) {
        // 409: this voter already liked it — idempotent success.
        if (isCode(error, 409)) return { liked: true, likes: await currentLikes(projectId) };
        throw error;
      }
      return { liked: true, likes: await increment(projectId) };
    },

    async approvedComments(projectId) {
      const page = await db.listRows({
        databaseId,
        tableId: TABLES.comments,
        queries: [
          Query.equal("projectId", projectId),
          Query.equal("status", "approved"),
          Query.orderAsc("$createdAt"),
          Query.limit(100),
        ],
        total: false,
      });
      return page.rows.map(
        (row): PublicComment => ({
          id: row.$id,
          author: String(row.author ?? ""),
          body: String(row.body ?? ""),
          createdAt: row.$createdAt,
        }),
      );
    },

    async submitComment({ projectId, author, body, ipHash }) {
      await db.createRow({
        databaseId,
        tableId: TABLES.comments,
        rowId: ID.unique(),
        data: { projectId, author, body, ipHash, status: "pending" },
      });
    },
  };
}
