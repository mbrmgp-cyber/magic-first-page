import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import { localizeText, useI18n } from "@/lib/i18n";

interface Props {
  onScan: (text: string) => void;
  onError?: (err: string) => void;
}

export async function decodeQrFromFile(file: File, elementId: string, showImage = false) {
  const mod = await import("html5-qrcode");
  const host = document.getElementById(elementId);
  if (host) host.innerHTML = "";
  // eslint-disable-next-line new-cap
  const scanner = new mod.Html5Qrcode(elementId);
  try {
    try {
      return await scanner.scanFile(file, showImage);
    } catch (firstError) {
      const prepared = await prepareQrImageForScan(file);
      if (prepared === file) throw firstError;
      return await scanner.scanFile(prepared, showImage);
    }
  } finally {
    try { scanner.clear(); } catch {}
  }
}

async function prepareQrImageForScan(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const side = Math.max(bitmap.width, bitmap.height, 900);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, side, side);
  const scale = Math.min((side * 0.86) / bitmap.width, (side * 0.86) / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  ctx.drawImage(bitmap, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
  const image = ctx.getImageData(0, 0, side, side);
  for (let i = 0; i < image.data.length; i += 4) {
    const gray = image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114;
    const v = gray > 145 ? 255 : 0;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? new File([blob], "qr-upload.png", { type: "image/png" }) : file;
}

export function QrScanner({ onScan, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const idRef = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const [busy, setBusy] = useState(false);
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("html5-qrcode");
      if (cancelled) return;
      // eslint-disable-next-line new-cap
      const scanner = new mod.Html5Qrcode(idRef.current);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (text: string) => {
            scanner.stop().catch(() => {});
            onScan(text);
          },
          () => {}
        );
      } catch (e: any) {
        onError?.(e.message ?? lt("Camera access denied", "కెమెరా అనుమతి లేదు"));
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) s.stop().catch(() => {}).then(() => { try { s.clear?.(); } catch {} });
    };
  }, [onScan, onError]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      try { await scannerRef.current?.stop(); } catch {}
      try { scannerRef.current?.clear(); } catch {}
      const result = await decodeQrFromFile(file, idRef.current, false);
      onScan(result);
    } catch (err: any) {
      onError?.(err?.message ?? lt("Could not read QR from image", "చిత్రం నుండి QR చదవలేకపోయాం"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div id={idRef.current} ref={ref} className="w-full rounded-lg overflow-hidden bg-black aspect-square" />
      <div className="flex justify-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="gap-2 w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0 shadow-[0_0_24px_rgba(255,140,40,0.4)]"
        >
          <ImageIcon className="h-4 w-4" />
          {busy ? lt("Reading…", "చదువుతున్నాం…") : lt("Upload QR from Gallery", "గ్యాలరీ నుండి QR అప్లోడ్")}
        </Button>
      </div>
    </div>
  );
}
