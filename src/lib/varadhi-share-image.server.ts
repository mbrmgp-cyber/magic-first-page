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

// Center-crop ("cover") bilinear resize of RGBA pixels to the target box.
function coverResize(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  if (sw === dw && sh === dh) return src;
  const scale = Math.max(dw / sw, dh / sh);
  const ox = (sw - dw / scale) / 2;
  const oy = (sh - dh / scale) / 2;
  const out = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1, Math.max(0, oy + (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, Math.max(0, ox + (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), wx = fx - x0;
      const a = (y0 * sw + x0) * 4, b = (y0 * sw + x1) * 4, c = (y1 * sw + x0) * 4, d = (y1 * sw + x1) * 4;
      const o = (y * dw + x) * 4;
      for (let k = 0; k < 3; k++) {
        const t = src[a + k] * (1 - wx) + src[b + k] * wx;
        const u = src[c + k] * (1 - wx) + src[d + k] * wx;
        out[o + k] = t * (1 - wy) + u * wy;
      }
      out[o + 3] = 255;
    }
  }
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
    const top = coverResize(photo.data, photo.width, photo.height, SHARE_PHOTO_WIDTH, SHARE_PHOTO_HEIGHT);
    const height = SHARE_PHOTO_HEIGHT + band.height;
    const data = new Uint8Array(width * height * 4);
    data.set(top, 0);
    data.set(band.data, SHARE_PHOTO_WIDTH * SHARE_PHOTO_HEIGHT * 4);
    const encoded = jpeg.encode({ data, width, height }, 72);
    return new Uint8Array(encoded.data);
  } catch {
    return null;
  }
}
