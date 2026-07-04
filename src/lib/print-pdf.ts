// Client-side "PDF" export via a hidden same-origin iframe.
// Works reliably on mobile (Chrome/Safari) where window.open('') + document.write
// often results in a blank page. User picks "Save as PDF" or a printer from the
// native print dialog.
import mbrLogo from "@/assets/mbr-logo.png.asset.json";

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type PrintDoc = {
  title: string;
  orgName: string;
  subtitle?: string;
  bodyHtml: string;
  logoUrl?: string | null;
};

// Convert a URL to an absolute URL so it resolves inside the srcdoc iframe.
function toAbsolute(u?: string | null): string {
  if (!u) return "";
  try {
    return new URL(u, window.location.origin).href;
  } catch {
    return u;
  }
}

function buildHtml({ title, orgName, subtitle, bodyHtml, logoUrl }: PrintDoc): string {
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  const societyLogo = toAbsolute(logoUrl);
  const mbrUrl = toAbsolute(mbrLogo.url);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 12mm 22mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Noto Sans Telugu", "Segoe UI", Roboto, sans-serif;
    color: #111;
    font-size: 12px;
    line-height: 1.5;
    background: #fff;
  }
  .doc-header {
    text-align: center;
    border-bottom: 3px solid;
    border-image: linear-gradient(90deg,#FF9933 0%,#FFFFFF 50%,#138808 100%) 1;
    padding-bottom: 10px;
    margin: 0 0 16px;
  }
  .doc-logo {
    display: block;
    margin: 0 auto 6px;
    max-height: 70px;
    max-width: 160px;
    object-fit: contain;
  }
  .doc-org { font-size: 20px; font-weight: 800; color: #8B1A1A; letter-spacing: 0.3px; }
  .doc-title { font-size: 15px; font-weight: 700; margin-top: 4px; color: #111; }
  .doc-subtitle { font-size: 11px; color: #555; margin-top: 2px; }
  h2 {
    font-size: 14px; margin: 18px 0 8px;
    color: #fff; background: linear-gradient(90deg,#8B1A1A,#B22222);
    padding: 6px 10px; border-radius: 4px;
  }
  ol, ul { padding-left: 20px; margin: 6px 0 12px; }
  li { margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; background: #fff; }
  th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 11px; }
  thead { display: table-header-group; }
  thead th { background: #f4e6d0; color: #111; font-weight: 700; }
  tr { page-break-inside: avoid; }
  .milestone { padding: 8px 10px; border-left: 3px solid #FF9933; background: #fff8ef; margin: 6px 0; page-break-inside: avoid; border-radius: 3px; }
  .milestone .date { font-size: 10px; color: #666; }
  .milestone .m-title { font-weight: 700; margin-top: 2px; }
  .milestone .desc { white-space: pre-wrap; margin-top: 3px; }
  .content { padding: 0 4px; }

  /* Fixed footer repeats on every printed page in most browsers. */
  .print-footer {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    height: 14mm;
    padding: 4mm 12mm 0;
    border-top: 1px solid #ddd;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 9px;
    color: #666;
    background: #fff;
  }
  .print-footer img { height: 14px; width: auto; }
  @media screen {
    body { padding: 16px 16px 80px; }
  }
</style>
</head>
<body>
  <div class="doc-header">
    ${societyLogo ? `<img class="doc-logo" src="${escapeHtml(societyLogo)}" alt="logo" crossorigin="anonymous" />` : ""}
    <div class="doc-org">${escapeHtml(orgName || "Society")}</div>
    <div class="doc-title">${escapeHtml(title)}</div>
    <div class="doc-subtitle">${escapeHtml(subtitle || today)}</div>
  </div>
  <div class="content">
    ${bodyHtml}
  </div>
  <div class="print-footer">
    <img src="${escapeHtml(mbrUrl)}" alt="MBR" />
    <span>Download from MBR APP</span>
  </div>
</body>
</html>`;
}

export function printDocument(doc: PrintDoc) {
  const html = buildHtml(doc);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.srcdoc = html;

  const cleanup = () => {
    setTimeout(() => {
      try { iframe.remove(); } catch { /* noop */ }
    }, 1000);
  };

  iframe.onload = () => {
    try {
      const win = iframe.contentWindow;
      const idoc = iframe.contentDocument;
      if (!win || !idoc) { cleanup(); return; }

      // Wait for images (header logo, footer MBR logo) to finish decoding so
      // the print dialog doesn't capture missing/half-rendered assets.
      const imgs = Array.from(idoc.images);
      const waits = imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((res) => {
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        });
      });

      Promise.all(waits).then(() => {
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {
            console.error("print failed", e);
          }
          cleanup();
        }, 200);
      });
    } catch (e) {
      console.error("iframe print error", e);
      cleanup();
    }
  };

  document.body.appendChild(iframe);
}
