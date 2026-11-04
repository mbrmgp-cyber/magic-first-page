import jpeg from "jpeg-js";
import { VARADHI_SHARE_BAND_JPEG_BASE64 } from "./varadhi-share-band.server";

export const SHARE_PHOTO_WIDTH = 800;
export const SHARE_PHOTO_HEIGHT = 640;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Stacks the listing photo (800x640 JPEG) above the Vaaradhi logo strip so a
 * single WhatsApp preview image shows the item first and the logo below.
 * Returns null when the photo cannot be decoded (caller serves it unchanged).
 */
export function composeShareImage(photoJpeg: Uint8Array): Uint8Array | null {
  try {
    const photo = jpeg.decode(photoJpeg, { useTArray: true, maxMemoryUsageInMB: 64 });
    const band = jpeg.decode(base64ToBytes(VARADHI_SHARE_BAND_JPEG_BASE64), { useTArray: true });
    const width = band.width;
    if (photo.width !== width) return null;
    const height = photo.height + band.height;
    const data = new Uint8Array(width * height * 4);
    data.set(photo.data, 0);
    data.set(band.data, photo.width * photo.height * 4);
    const encoded = jpeg.encode({ data, width, height }, 72);
    return new Uint8Array(encoded.data);
  } catch {
    return null;
  }
}
