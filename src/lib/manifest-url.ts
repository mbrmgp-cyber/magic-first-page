/**
 * Chrome/Android ignore `blob:` manifest URLs when installing a site to the
 * home screen (the shortcut then falls back to the browser's own name/icon).
 * A `data:` manifest URL is honoured, so build one instead.
 */
export function toManifestDataUrl(manifest: unknown): string {
  return `data:application/manifest+json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(manifest),
  )}`;
}
