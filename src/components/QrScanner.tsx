import { useEffect, useRef } from "react";

interface Props {
  onScan: (text: string) => void;
  onError?: (err: string) => void;
}

export function QrScanner({ onScan, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(`qr-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let scanner: any;
    let cancelled = false;
    (async () => {
      const mod = await import("html5-qrcode");
      if (cancelled) return;
      // eslint-disable-next-line new-cap
      scanner = new mod.Html5Qrcode(idRef.current);
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
      if (scanner) scanner.stop().catch(() => {}).then(() => scanner.clear().catch(() => {}));
    };
  }, [onScan, onError]);

  return <div id={idRef.current} ref={ref} className="w-full rounded-lg overflow-hidden bg-black" />;
}
