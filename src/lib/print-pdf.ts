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
      html, body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
        min-height: 297mm !important;
        overflow: visible !important;
      }
      body > *:not(#${PRINT_ROOT_ID}) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
        background: transparent !important;
        background-image: none !important;
        background-color: transparent !important;
        box-shadow: none !important;
        transform: scale(0) !important;
      }
      body > *:not(#${PRINT_ROOT_ID}) * {
        visibility: hidden !important;
        color: transparent !important;
        background: transparent !important;
        background-image: none !important;
        background-color: transparent !important;
        box-shadow: none !important;
        border-color: transparent !important;
      }
      #${PRINT_ROOT_ID} {
        display: block !important;
        position: relative !important;
        z-index: 2147483647 !important;
        width: 100% !important;
        min-height: 297mm !important;
        background: #fff !important;
        color: #111 !important;
      }
      #${PRINT_ROOT_ID}::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: -1;
        background: #fff !important;
      }
      .mbr-global-ad-bar,
      .mbr-global-ad-bar *,
      [data-radix-portal],
      [data-radix-dialog-overlay],
      [role="dialog"],
      [data-sonner-toaster],
      .no-print {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        background: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
      }
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

  const removedSiblings: Array<{ node: Element; marker: Comment }> = [];
  const detachNonPrintSiblings = () => {
    Array.from(document.body.children).forEach((node) => {
      if (node === printRoot) return;
      const marker = document.createComment("mbr-print-placeholder");
      node.parentNode?.insertBefore(marker, node);
      node.remove();
      removedSiblings.push({ node, marker });
    });
  };
  const restoreNonPrintSiblings = () => {
    removedSiblings.splice(0).forEach(({ node, marker }) => {
      marker.parentNode?.insertBefore(node, marker);
      marker.remove();
    });
  };

  document.documentElement.classList.add("mbr-printing");
  document.body.classList.add("mbr-printing");
  detachNonPrintSiblings();

  let printStartedAt = 0;
  let cleanupTimer: number | undefined;
  let cleaned = false;
  let leftPrintPreview = false;

  const cleanup = (delay = 500) => {
    if (cleanupTimer) window.clearTimeout(cleanupTimer);
    cleanupTimer = window.setTimeout(() => {
      if (cleaned) return;
      cleaned = true;
      try { printRoot.remove(); } catch { /* noop */ }
      try { printStyle.remove(); } catch { /* noop */ }
      try { scopeStyle.remove(); } catch { /* noop */ }
      try { restoreNonPrintSiblings(); } catch { /* noop */ }
      document.documentElement.classList.remove("mbr-printing");
      document.body.classList.remove("mbr-printing");
      window.removeEventListener("afterprint", onAfter);
      window.removeEventListener("blur", onLeaveForPreview);
      window.removeEventListener("focus", onReturnFromPreview);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }, delay);
  };
  const onAfter = () => {
    const elapsed = Date.now() - printStartedAt;
    cleanup(elapsed < 5_000 ? 60_000 : 500);
  };
  const onLeaveForPreview = () => {
    if (printStartedAt > 0) leftPrintPreview = true;
  };
  const onReturnFromPreview = () => {
    if (leftPrintPreview) cleanup(250);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") onLeaveForPreview();
    if (document.visibilityState === "visible") cleanup(250);
  };
  const onPageHide = () => onLeaveForPreview();
  window.addEventListener("afterprint", onAfter);
  window.addEventListener("blur", onLeaveForPreview);
  window.addEventListener("focus", onReturnFromPreview);
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onVisibilityChange);

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
        printStartedAt = Date.now();
        window.print();
      } catch (e) {
        console.error("print failed", e);
      }
      // Mobile print previews can rebuild the PDF after paper-size changes.
      // Keep the clean print DOM in place long enough so Android/Chromium
      // never snapshots the underlying app/ad bar during that preview.
      cleanup(60_000);
    }, 200);
  });
}

