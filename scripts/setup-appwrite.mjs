#!/usr/bin/env node
/**
 * Creates (idempotently) the Appwrite TablesDB schema for likes & comments.
 * Names mirror src/lib/engagement/schema.ts. Safe to re-run: anything that
 * already exists (409) is skipped.
 *
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
 *     node scripts/setup-appwrite.mjs
 *
 * The API key needs the databases.write, tables.write, columns.write and
 * indexes.write scopes. No table grants client permissions: only the server
 * (API key) reads or writes, so nobody can bypass the endpoints' checks.
 */
import { AppwriteException, Client, TablesDB, TablesDBIndexType } from "node-appwrite";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
const databaseId = process.env.APPWRITE_DATABASE_ID || "builders";
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY.");
  process.exit(1);
}

const db = new TablesDB(
  new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY),
);

async function ensure(label, create) {
  try {
    await create();
    console.log(`+ ${label}`);
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) console.log(`= ${label} (exists)`);
    else throw error;
  }
}

// Columns are created asynchronously; indexes need them "available" first.
async function waitForColumns(tableId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { columns } = await db.listColumns({ databaseId, tableId });
    if (columns.every((column) => column.status === "available")) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Columns of ${tableId} did not become available in time.`);
}

const table = (tableId, name) =>
  ensure(`table ${tableId}`, () => db.createTable({ databaseId, tableId, name, permissions: [], rowSecurity: false }));

await ensure(`database ${databaseId}`, () => db.create({ databaseId, name: "Asilo Builders" }));

// Counters (row id = project id).
await table("project_stats", "Project stats");
await ensure("project_stats.likes", () =>
  db.createIntegerColumn({ databaseId, tableId: "project_stats", key: "likes", required: false, min: 0, xdefault: 0 }));

// Likes (row id = hash(project id, voter)): uniqueness by construction.
await table("project_likes", "Project likes");
await ensure("project_likes.projectId", () =>
  db.createVarcharColumn({ databaseId, tableId: "project_likes", key: "projectId", size: 12, required: true }));
await ensure("project_likes.voter", () =>
  db.createVarcharColumn({ databaseId, tableId: "project_likes", key: "voter", size: 64, required: true }));
await ensure("project_likes.ipHash", () =>
  db.createVarcharColumn({ databaseId, tableId: "project_likes", key: "ipHash", size: 64, required: true }));
await waitForColumns("project_likes");
await ensure("index project_likes(projectId, ipHash)", () =>
  db.createIndex({ databaseId, tableId: "project_likes", key: "by_project_network", type: TablesDBIndexType.Key, columns: ["projectId", "ipHash"] }));

// Comments: pre-moderated; the site renders `approved` only.
await table("project_comments", "Project comments");
await ensure("project_comments.projectId", () =>
  db.createVarcharColumn({ databaseId, tableId: "project_comments", key: "projectId", size: 12, required: true }));
await ensure("project_comments.author", () =>
  db.createVarcharColumn({ databaseId, tableId: "project_comments", key: "author", size: 60, required: true }));
await ensure("project_comments.body", () =>
  db.createTextColumn({ databaseId, tableId: "project_comments", key: "body", required: true }));
await ensure("project_comments.ipHash", () =>
  db.createVarcharColumn({ databaseId, tableId: "project_comments", key: "ipHash", size: 64, required: true }));
await ensure("project_comments.status", () =>
  db.createEnumColumn({ databaseId, tableId: "project_comments", key: "status", elements: ["pending", "approved", "rejected"], required: false, xdefault: "pending" }));
await waitForColumns("project_comments");
await ensure("index project_comments(projectId, status)", () =>
  db.createIndex({ databaseId, tableId: "project_comments", key: "by_project_status", type: TablesDBIndexType.Key, columns: ["projectId", "status"] }));
await ensure("index project_comments(status)", () =>
  db.createIndex({ databaseId, tableId: "project_comments", key: "by_status", type: TablesDBIndexType.Key, columns: ["status"] }));

console.log("Done.");
