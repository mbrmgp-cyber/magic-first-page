import { useEffect, useState } from "react";
import logo from "@/assets/mbr-logo.png.asset.json";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2200);
    const t2 = setTimeout(onDone, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src={logo.url}
        alt="MBR — Management of Board Resources"
        className="w-[78%] max-w-[420px] animate-[mbrFadeUp_900ms_ease-out_both] drop-shadow-[0_0_40px_rgba(255,140,40,0.35)]"
      />
      <div className="mt-8 text-center animate-[mbrFadeUp_900ms_ease-out_300ms_both]">
        <div className="text-white text-2xl sm:text-3xl font-semibold tracking-wide leading-tight">
          Management of{" "}
          <span style={{ color: "#FF8C28" }}>Board</span>{" "}
          Resources
        </div>
        <div className="mt-3 h-[3px] w-48 mx-auto rounded-full" style={{ background: "linear-gradient(90deg,#FF9933,#FFFFFF,#138808)" }} />
      </div>
      <style>{`
        @keyframes mbrFadeUp {
          0% { opacity: 0; transform: translateY(14px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
