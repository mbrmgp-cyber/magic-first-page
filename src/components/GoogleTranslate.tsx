import { useEffect } from "react";
import { Globe } from "lucide-react";

// Google Translate Element integration.
// Renders a compact language picker that sits to the LEFT of the Settings gear.
// The Google widget handles all translations natively — no manual transliteration,
// no encoding corruption. It targets the entire page (<html>).

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

let injected = false;

function injectGoogleTranslate() {
  if (injected || typeof window === "undefined") return;
  injected = true;

  window.googleTranslateElementInit = () => {
    if (!window.google?.translate?.TranslateElement) return;
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages:
          "en,te,hi,ta,kn,ml,mr,bn,gu,pa,ur,or,as,ne,si,ar,fr,de,es,pt,ru,zh-CN,ja,ko,it,tr,id,vi,th",
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
      },
      "google_translate_element",
    );
  };

  const s = document.createElement("script");
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  document.body.appendChild(s);

  // Hide Google's top banner/frame that can shift layout.
  const style = document.createElement("style");
  style.textContent = `
    .goog-te-banner-frame, .skiptranslate iframe.goog-te-banner-frame { display: none !important; }
    body { top: 0 !important; }
    .goog-logo-link, .goog-te-gadget span { display: none !important; }
    .goog-te-gadget { color: transparent !important; font-size: 0 !important; }
    .goog-te-gadget .goog-te-combo {
      color: #fff;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 9999px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }
    .goog-te-gadget .goog-te-combo option { color: #000; background: #fff; }
    #goog-gt-tt, .goog-tooltip, .goog-tooltip:hover { display: none !important; }
    body { -webkit-text-size-adjust: 100% !important; }
  `;
  document.head.appendChild(style);
}

export function GoogleTranslate({ className = "" }: { className?: string }) {
  useEffect(() => {
    injectGoogleTranslate();
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      data-notranslit
      translate="no"
    >
      <Globe className="h-4 w-4 text-[#ff8c28]" />
      <div id="google_translate_element" />
    </div>
  );
}
