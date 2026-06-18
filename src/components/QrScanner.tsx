import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";

interface Props {
  onScan: (text: string) => void;
  onError?: (err: string) => void;
}

export function QrScanner({ onScan, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const idRef = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const [busy, setBusy] = useState(false);

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
          { fps: 10, qrbox: 240 },
          (text: string) => {
            scanner.stop().catch(() => {});
            onScan(text);
          },
          () => {}
        );
      } catch (e: any) {
        onError?.(e.message ?? "Camera access denied");
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) s.stop().catch(() => {}).then(() => s.clear?.().catch(() => {}));
    };
  }, [onScan, onError]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const mod = await import("html5-qrcode");
      // Stop live scan while reading file.
      try { await scannerRef.current?.stop(); } catch {}
      // eslint-disable-next-line new-cap
      const fileScanner = new mod.Html5Qrcode(idRef.current);
      const result = await fileScanner.scanFile(file, true);
      await fileScanner.clear().catch(() => {});
      onScan(result);
    } catch (err: any) {
      onError?.(err?.message ?? "Could not read QR from image");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div id={idRef.current} ref={ref} className="w-full rounded-lg overflow-hidden bg-black" />
      <div className="flex justify-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="gap-2"
        >
          <ImageIcon className="h-4 w-4" />
          {busy ? "Reading…" : "Upload from gallery"}
        </Button>
      </div>
    </div>
  );
}
