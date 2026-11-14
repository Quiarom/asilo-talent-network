import { Client, ID, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { LOGO_BUCKET_ID } from "../projects-logo";
import type { LogoStorage } from "./types";

export interface AppwriteLogoConfig {
  endpoint: string;
  projectId: string;
  apiKey: string;
}

export function createAppwriteLogoStorage(config: AppwriteLogoConfig): LogoStorage {
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  const storage = new Storage(client);
  return {
    async upload(logo) {
      const uploaded = await storage.createFile({
        bucketId: LOGO_BUCKET_ID,
        fileId: ID.unique(),
        file: InputFile.fromBuffer(logo.buffer, logo.filename),
        permissions: [Permission.read(Role.any())],
      });
      return uploaded.$id;
    },
  };
}
