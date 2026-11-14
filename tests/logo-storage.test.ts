import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLogoStorage, LogoStorageUnavailable } from "../src/lib/logo-storage";
import { logoUrlForReference } from "../src/lib/logo-storage/public-url";
import { parseProjects } from "../src/lib/projects-loader";

const s3 = vi.hoisted(() => ({ send: vi.fn(), destroy: vi.fn(), config: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => ({
  ...await importOriginal<typeof import("@aws-sdk/client-s3")>(),
  S3Client: class {
    constructor(config: unknown) { s3.config(config); }
    send = s3.send;
    destroy = s3.destroy;
  },
}));

const S3_ENV = {
  LOGO_STORAGE_PROVIDER: "s3",
  LOGO_S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  LOGO_S3_REGION: "auto",
  LOGO_S3_BUCKET: "logos",
  LOGO_S3_ACCESS_KEY_ID: "test-access",
  LOGO_S3_SECRET_ACCESS_KEY: "test-secret",
  LOGO_S3_PUBLIC_BASE_URL: "https://logos.example.com/",
  LOGO_S3_FORCE_PATH_STYLE: "false",
};

beforeEach(() => {
  for (const [key, value] of Object.entries(S3_ENV)) vi.stubEnv(key, value);
  vi.stubEnv("APPWRITE_ENDPOINT", "https://appwrite.example.com/v1");
  vi.stubEnv("APPWRITE_PROJECT_ID", "test-project");
  vi.stubEnv("APPWRITE_API_KEY", "");
  vi.stubEnv("LOGO_LEGACY_PUBLIC_BASE_URL", "");
  s3.send.mockResolvedValue({});
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("logo reads during migration", () => {
  it("renders mixed Appwrite and S3 rows independently of the upload provider and keys", () => {
    vi.stubEnv("LOGO_S3_ACCESS_KEY_ID", "");
    vi.stubEnv("LOGO_S3_SECRET_ACCESS_KEY", "");
    const [legacy, next] = parseProjects([
      ["Nombre", "Sitio web", "ID del logo", "Aprobado"],
      ["A", "https://a.example", "old-logo-id", "SI"],
      ["B", "https://b.example", "s3:project-logos/new.webp", "SI"],
    ]);
    expect(legacy.logoUrl).toBe("https://appwrite.example.com/v1/storage/buckets/project-logos/files/old-logo-id/view?project=test-project");
    expect(next.logoUrl).toBe("https://logos.example.com/project-logos/new.webp");
    vi.stubEnv("LOGO_STORAGE_PROVIDER", "appwrite");
    expect(logoUrlForReference("s3:project-logos/new.webp")).toBe(next.logoUrl);
  });

  it("serves copied legacy IDs and new logos after all Appwrite variables are removed", () => {
    vi.stubEnv("APPWRITE_ENDPOINT", "");
    vi.stubEnv("APPWRITE_PROJECT_ID", "");
    vi.stubEnv("LOGO_LEGACY_PUBLIC_BASE_URL", "https://cdn.example.com/legacy/");
    expect(logoUrlForReference(" old-logo-id ")).toBe("https://cdn.example.com/legacy/old-logo-id");
    expect(logoUrlForReference("s3:project-logos/new.webp")).toBe("https://logos.example.com/project-logos/new.webp");
  });

  it("requires only the public S3 base for S3 reads, without leaking to the API endpoint", () => {
    vi.stubEnv("LOGO_S3_PUBLIC_BASE_URL", "");
    expect(logoUrlForReference("s3:project-logos/new.webp")).toBeUndefined();
  });

  it.each(["", "s3:", "s3:../secret", "s3:/foo", "s3:a//b", "s3:a/./b", "s3:a/%2e%2e/b", "https://untrusted.example/x", "javascript:alert(1)", "unknown:key", "../legacy"])("omits invalid reference %s", (ref) => {
    expect(logoUrlForReference(ref)).toBeUndefined();
  });

  it.each(["javascript:alert(1)", "https://user:secret@cdn.example", "https://cdn.example?token=secret", "https://cdn.example#section", "not a url"])("rejects invalid public bases: %s", (base) => {
    vi.stubEnv("LOGO_S3_PUBLIC_BASE_URL", base);
    vi.stubEnv("LOGO_LEGACY_PUBLIC_BASE_URL", base);
    expect(logoUrlForReference("s3:project-logos/new.webp")).toBeUndefined();
    expect(logoUrlForReference("old-logo-id")).toBeUndefined();
  });
});

describe("S3-compatible writes", () => {
  it("uploads an immutable WebP with a unique key and returns a renderable sheet reference", async () => {
    const buffer = Buffer.from("prepared WebP bytes");
    const storage = await getLogoStorage();
    const reference = await storage.upload({ buffer, filename: "logo.webp" });
    expect(s3.config).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: S3_ENV.LOGO_S3_ENDPOINT, region: "auto", forcePathStyle: false,
      credentials: { accessKeyId: "test-access", secretAccessKey: "test-secret" },
    }));
    const input = s3.send.mock.calls[0][0].input;
    expect(input).toEqual({
      Bucket: "logos", Key: expect.stringMatching(/^project-logos\/[a-f0-9-]{36}\.webp$/),
      Body: buffer, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable",
    });
    expect(reference).toBe(`s3:${input.Key}`);
    expect(logoUrlForReference(reference)).toBe(`https://logos.example.com/${input.Key}`);
    expect(s3.destroy).toHaveBeenCalledOnce();
  });

  it("uses AWS's default endpoint and honors path-style configuration", async () => {
    vi.stubEnv("LOGO_S3_ENDPOINT", "");
    vi.stubEnv("LOGO_S3_REGION", "us-east-1");
    vi.stubEnv("LOGO_S3_FORCE_PATH_STYLE", "true");
    await getLogoStorage();
    expect(s3.config).toHaveBeenCalledWith(expect.objectContaining({ endpoint: undefined, region: "us-east-1", forcePathStyle: true }));
  });

  it.each(["LOGO_S3_REGION", "LOGO_S3_BUCKET", "LOGO_S3_ACCESS_KEY_ID", "LOGO_S3_SECRET_ACCESS_KEY", "LOGO_S3_PUBLIC_BASE_URL"])("rejects missing %s before attempting a write", async (variable) => {
    vi.stubEnv(variable, "");
    await expect(getLogoStorage()).rejects.toBeInstanceOf(LogoStorageUnavailable);
    expect(s3.send).not.toHaveBeenCalled();
    expect(s3.config).not.toHaveBeenCalled();
  });

  it.each([
    ["LOGO_STORAGE_PROVIDER", "azure"],
    ["LOGO_S3_ENDPOINT", "not an endpoint"],
    ["LOGO_S3_FORCE_PATH_STYLE", "yes"],
    ["LOGO_S3_PUBLIC_BASE_URL", "https://cdn.example?token=secret"],
  ])("fails closed for invalid %s", async (variable, value) => {
    vi.stubEnv(variable, value);
    await expect(getLogoStorage()).rejects.toBeInstanceOf(LogoStorageUnavailable);
    expect(s3.config).not.toHaveBeenCalled();
  });

  it("propagates upload failure without returning a reference and releases the client", async () => {
    s3.send.mockRejectedValueOnce(new Error("upstream failure"));
    const storage = await getLogoStorage();
    await expect(storage.upload({ buffer: Buffer.from("webp"), filename: "logo.webp" })).rejects.toThrow("upstream failure");
    expect(s3.destroy).toHaveBeenCalledOnce();
  });
});
