import { publicBaseUrl } from "./public-url";
import type { LogoStorage } from "./types";

export class LogoStorageUnavailable extends Error {
  constructor() { super("Logo storage is not configured"); }
}

/** Server-only selector. Defaults to Appwrite so deploying this PR is reversible. */
export async function getLogoStorage(): Promise<LogoStorage> {
  const provider = import.meta.env.LOGO_STORAGE_PROVIDER?.trim() || "appwrite";
  if (provider === "appwrite") {
    const endpoint = publicBaseUrl(import.meta.env.APPWRITE_ENDPOINT);
    const projectId = import.meta.env.APPWRITE_PROJECT_ID;
    const apiKey = import.meta.env.APPWRITE_API_KEY;
    if (!endpoint || !projectId || !apiKey) throw new LogoStorageUnavailable();
    const { createAppwriteLogoStorage } = await import("./appwrite");
    return createAppwriteLogoStorage({ endpoint, projectId, apiKey });
  }
  if (provider === "s3") {
    const rawEndpoint = import.meta.env.LOGO_S3_ENDPOINT;
    const endpoint = publicBaseUrl(rawEndpoint);
    const region = import.meta.env.LOGO_S3_REGION;
    const bucket = import.meta.env.LOGO_S3_BUCKET;
    const accessKeyId = import.meta.env.LOGO_S3_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.LOGO_S3_SECRET_ACCESS_KEY;
    const publicUrl = publicBaseUrl(import.meta.env.LOGO_S3_PUBLIC_BASE_URL);
    const pathStyle = import.meta.env.LOGO_S3_FORCE_PATH_STYLE || "false";
    if (!region || !bucket || !accessKeyId || !secretAccessKey || !publicUrl ||
        (rawEndpoint?.trim() && !endpoint) || !["true", "false"].includes(pathStyle)) {
      throw new LogoStorageUnavailable();
    }
    const { createS3LogoStorage } = await import("./s3");
    return createS3LogoStorage({ endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle: pathStyle === "true" });
  }
  // An explicit unknown provider must never silently write to Appwrite.
  throw new LogoStorageUnavailable();
}
