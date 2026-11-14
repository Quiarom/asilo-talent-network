/** Server-side input, already validated and converted to WebP by prepareLogo. */
export interface LogoUpload {
  buffer: Buffer;
  filename: string;
}

/** Returns an opaque reference to persist in the existing `ID del logo` cell. */
export interface LogoStorage {
  upload(logo: LogoUpload): Promise<string>;
}
