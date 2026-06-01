// Image URL schemes allowed for fetching when reading.
// data: / blob: are page-embedded images (from the extension's own context),
// so they are safe to handle.
const ALLOWED_IMAGE_SCHEMES = ["http:", "https:", "data:", "blob:"];

// URL schemes allowed to open in a new tab as a decoded result.
// Rejects javascript: / data: / file: etc., limiting navigation to http(s).
const OPENABLE_SCHEMES = ["http:", "https:"];

function schemeOf(url: string): string | null {
  try {
    return new URL(url).protocol;
  } catch {
    return null;
  }
}

/** Whether the scheme is allowed as an image source (http/https/data/blob). */
export function isAllowedImageScheme(url: string): boolean {
  const scheme = schemeOf(url);
  return scheme !== null && ALLOWED_IMAGE_SCHEMES.includes(scheme);
}

/** Whether a decoded-result URL may be opened in a new tab (http/https only). */
export function isOpenableUrl(url: string): boolean {
  const scheme = schemeOf(url);
  return scheme !== null && OPENABLE_SCHEMES.includes(scheme);
}
