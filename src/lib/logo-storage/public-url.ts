import { LOGO_BUCKET_ID } from "../projects-logo";

/** Public bases must be permanent URLs, never signed URLs or API credentials. */
export function publicBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

function safeKey(key: string): boolean {
  return key.split("/").every((part) => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(part));
}

/** No SDKs or secret keys are needed to render either old or new logos. */
export function logoUrlForReference(reference: string): string | undefined {
  const ref = reference.trim();
  if (!ref) return undefined;

  if (ref.startsWith("s3:")) {
    const key = ref.slice(3);
    const base = publicBaseUrl(import.meta.env.LOGO_S3_PUBLIC_BASE_URL);
    if (!base || !safeKey(key)) return undefined;
    return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  // Bare IDs are historical Appwrite references. Copying their files with
  // these same keys lets any public object store serve them without a sheet edit.
  if (!safeKey(ref) || ref.includes("/")) return undefined;
  const legacyBase = import.meta.env.LOGO_LEGACY_PUBLIC_BASE_URL;
  if (legacyBase?.trim()) {
    const base = publicBaseUrl(legacyBase);
    return base ? `${base}/${encodeURIComponent(ref)}` : undefined;
  }

  const endpoint = publicBaseUrl(import.meta.env.APPWRITE_ENDPOINT);
  const projectId = import.meta.env.APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) return undefined;
  return `${endpoint}/storage/buckets/${LOGO_BUCKET_ID}/files/${encodeURIComponent(ref)}/view?project=${encodeURIComponent(projectId)}`;
}
