// Lightweight client-side "PDF" export: opens a formatted print window
// and triggers the standard browser print / "Save as PDF" dialog.
// Works on mobile (Chrome / Safari) — user picks "Save as PDF" or a printer.

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type PrintDoc = {
  title: string;        // shown in <title> (used as PDF filename) & document header
  orgName: string;      // society name shown at the top of every printed page
  subtitle?: string;    // e.g. date / section subtitle
  bodyHtml: string;     // pre-escaped HTML content
};

export function printDocument({ title, orgName, subtitle, bodyHtml }: PrintDoc) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
  if (!win) {
    alert("దయచేసి pop-ups అనుమతించండి / Please allow pop-ups to download the PDF.");
    return;
  }
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Noto Sans Telugu", "Segoe UI", Roboto, sans-serif;
    color: #111;
    font-size: 12px;
    line-height: 1.5;
    padding: 16px;
    background: #fff;
  }
  .doc-header {
    text-align: center;
    border-bottom: 3px solid;
    border-image: linear-gradient(90deg,#FF9933 0%,#FFFFFF 50%,#138808 100%) 1;
    padding-bottom: 10px;
    margin-bottom: 16px;
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
  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 11px; }
  thead th { background: #f4e6d0; color: #111; font-weight: 700; }
  tr { page-break-inside: avoid; }
  .milestone { padding: 8px 10px; border-left: 3px solid #FF9933; background: #fff8ef; margin: 6px 0; page-break-inside: avoid; border-radius: 3px; }
  .milestone .date { font-size: 10px; color: #666; }
  .milestone .m-title { font-weight: 700; margin-top: 2px; }
  .milestone .desc { white-space: pre-wrap; margin-top: 3px; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-org">${escapeHtml(orgName || "Society")}</div>
    <div class="doc-title">${escapeHtml(title)}</div>
    <div class="doc-subtitle">${escapeHtml(subtitle || today)}</div>
  </div>
  ${bodyHtml}
  <div class="footer">Generated on ${escapeHtml(today)}</div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
