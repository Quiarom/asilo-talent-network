import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { LogoStorage } from "./types";

export interface S3LogoConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export function createS3LogoStorage(config: S3LogoConfig): LogoStorage {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // Avoid optional checksum algorithms unsupported by some S3-compatible stores.
    requestChecksumCalculation: "WHEN_REQUIRED",
    maxAttempts: 2,
  });
  return {
    async upload(logo) {
      const key = `project-logos/${randomUUID()}.webp`;
      try {
        await client.send(new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: logo.buffer,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
          // Public reads are configured on the bucket/CDN, not via per-file ACLs.
        }), { abortSignal: AbortSignal.timeout(15_000) });
        return `s3:${key}`;
      } finally {
        client.destroy();
      }
    },
  };
}
