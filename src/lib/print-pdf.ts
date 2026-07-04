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

// Inline print approach: inject the print HTML into the CURRENT document
// and use @media print to hide everything else. This avoids a mobile-browser
// bug where changing the paper size in the native print dialog re-invokes
// print() on the top-level (parent) document instead of the iframe — which
// caused the dashboard to be printed on A4.
export function printDocument(doc: PrintDoc) {
  // Parse the standalone HTML we already build so we can reuse the exact
  // markup and stylesheet inside the parent page.
  const html = buildHtml(doc);
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");

  const PRINT_ROOT_ID = "mbr-print-root";
  const PRINT_STYLE_ID = "mbr-print-style";
  const PRINT_SCOPE_ID = "mbr-print-scope";

  // Remove any previous print artifacts.
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();
  document.getElementById(PRINT_SCOPE_ID)?.remove();

  // Copy the print document's <style> tags into the parent, scoped by
  // #mbr-print-root so selectors like `body`, `h2`, `table` only apply
  // inside the print container.
  const scopeStyle = document.createElement("style");
  scopeStyle.id = PRINT_SCOPE_ID;
  const styleTexts: string[] = [];
  parsed.querySelectorAll("style").forEach((s) => {
    // Rewrite `body { ... }` → `#mbr-print-root { ... }` so it applies inside our container.
    let css = s.textContent || "";
    css = css.replace(/(^|\})\s*body\s*\{/g, "$1 #mbr-print-root {");
    css = css.replace(/(^|\})\s*html\s*,\s*body\s*\{/g, "$1 #mbr-print-root {");
    styleTexts.push(css);
  });
  scopeStyle.textContent = styleTexts.join("\n");
  document.head.appendChild(scopeStyle);

  // Global print rules: hide the entire app; show only the print root.
  // This ensures that even if the browser prints the parent document
  // (e.g. after changing paper size on mobile Chrome), the output is our
  // clean PDF layout — not the dashboard screenshot.
  const printStyle = document.createElement("style");
  printStyle.id = PRINT_STYLE_ID;
  printStyle.textContent = `
    @media print {
      body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
      #${PRINT_ROOT_ID} { display: block !important; }
      html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    }
    @media screen {
      #${PRINT_ROOT_ID} { display: none !important; }
    }
  `;
  document.head.appendChild(printStyle);

  // Build the print root from the parsed document body.
  const printRoot = document.createElement("div");
  printRoot.id = PRINT_ROOT_ID;
  printRoot.innerHTML = parsed.body.innerHTML;
  document.body.appendChild(printRoot);

  const cleanup = () => {
    setTimeout(() => {
      try { printRoot.remove(); } catch { /* noop */ }
      try { printStyle.remove(); } catch { /* noop */ }
      try { scopeStyle.remove(); } catch { /* noop */ }
      window.removeEventListener("afterprint", onAfter);
    }, 500);
  };
  const onAfter = () => cleanup();
  window.addEventListener("afterprint", onAfter);

  // Wait for the injected images (logo, MBR mark) to decode before printing.
  const imgs = Array.from(printRoot.querySelectorAll("img"));
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
        window.focus();
        window.print();
      } catch (e) {
        console.error("print failed", e);
      }
      // Fallback cleanup for browsers that don't fire afterprint.
      setTimeout(cleanup, 2000);
    }, 200);
  });
}

