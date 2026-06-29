// Generate padded square PNG data URLs from a source logo URL.
// iOS/Android clip home-screen icons (rounded squares, circles, etc.), so we
// composite the logo at ~70% scale (any) or ~62% scale (maskable) on a solid
// background to guarantee a safe zone with no cropping.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function buildPaddedIcon(
  src: string,
  opts: { size: number; bg: string; scale?: number },
): Promise<string> {
  const { size, bg, scale = 0.7 } = opts;
  if (typeof document === "undefined") return src;
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;

    // Background fill (solid — no transparency so Android/iOS masks see a clean square).
    ctx.fillStyle = bg || "#000000";
    ctx.fillRect(0, 0, size, size);

    // Letterbox logo into a centered safe-zone box.
    const box = size * scale;
    const ratio = Math.min(box / img.width, box / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, w, h);

    return canvas.toDataURL("image/png");
  } catch {
    return src;
  }
}

export type PaddedIconSet = {
  any192: string;
  any512: string;
  maskable512: string;
  apple180: string;
};

export async function buildPaddedIconSet(
  src: string,
  bg: string,
): Promise<PaddedIconSet> {
  const [any192, any512, maskable512, apple180] = await Promise.all([
    buildPaddedIcon(src, { size: 192, bg, scale: 0.72 }),
    buildPaddedIcon(src, { size: 512, bg, scale: 0.72 }),
    buildPaddedIcon(src, { size: 512, bg, scale: 0.6 }),
    buildPaddedIcon(src, { size: 180, bg, scale: 0.78 }),
  ]);
  return { any192, any512, maskable512, apple180 };
}
