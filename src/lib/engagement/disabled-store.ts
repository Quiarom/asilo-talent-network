import type { EngagementStore } from "./types";

/** Used when Appwrite is not configured: reads are empty, writes refuse. */
export const disabledStore: EngagementStore = {
  enabled: false,
  async likeCounts() {
    return new Map();
  },
  async setLike() {
    throw new Error("Engagement store is not configured.");
  },
  async approvedComments() {
    return [];
  },
  async submitComment() {
    throw new Error("Engagement store is not configured.");
  },
};
