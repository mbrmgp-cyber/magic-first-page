// Canvas-rendered PDFs that support Telugu script and ₹/currency glyphs.
// jsPDF's built-in Helvetica cannot render Telugu, so we draw the document
// to a canvas using the loaded "Noto Sans Telugu" web font, then embed the
// canvas as a PNG page in the PDF.

const TELUGU_FONT = '"Noto Sans Telugu"';
const FONT_FAMILY = `${TELUGU_FONT}, "Noto Sans", "Arial Unicode MS", "Segoe UI", Arial, sans-serif`;
const FONT_SAMPLE = "చిట్వేల్ హెల్ప్ లైన్ సొసైటీ ₹ 123";

async function ensureFonts() {
  if (typeof document === "undefined") return;
  try {
    const fonts = (document as any).fonts;
    if (!fonts) return;
    await Promise.all([400, 600, 700, 800, 900].map((weight) => fonts.load(`${weight} 18px ${TELUGU_FONT}`, FONT_SAMPLE)));
    await Promise.race([
      fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 2500)),
    ]);
  } catch {}
}

function pdfText(text: unknown) {
  // Some Android PDF viewers mangle the rupee glyph in generated PDFs. "Rs."
  // stays readable everywhere while Telugu text is rendered through canvas.
  return String(text ?? "")
    .replace(/₹/g, "Rs.")
    .replace(/د\.إ/g, "AED")
    .replace(/د\.ك/g, "KWD");
}

function newPage(w = 1240, h = 1754) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  return { canvas: c, ctx, w, h };
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: number | string = 400) {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; weight?: number | string; align?: CanvasTextAlign; color?: string; maxWidth?: number } = {},
) {
  const safeText = pdfText(text);
  const size = opts.size ?? 14;
  let fitted = size;
  setFont(ctx, fitted, opts.weight ?? 400);
  if (opts.maxWidth) {
    while (fitted > 9 && ctx.measureText(safeText).width > opts.maxWidth) {
      fitted -= 1;
      setFont(ctx, fitted, opts.weight ?? 400);
    }
  }
  ctx.fillStyle = opts.color ?? "#111111";
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(safeText, x, y);
}

export type PersonalStatementInput = {
  orgName: string;
  title: string;
  date: string;
  member: { name: string; code: string; phone?: string | null; email?: string | null };
  labels: Record<string, string>;
  outstanding: string;
  monthlyInterest: string;
  principalPaid: string;
  interestPaid: string;
  newLoan: string;
  newLoanRate: string;
  remarks?: string;
  updatedBalance?: string;
  fileName: string;
};

export async function downloadPersonalStatementPdf(input: PersonalStatementInput) {
  const { jsPDF } = await import("jspdf");
  await ensureFonts();
  const { canvas, ctx, w } = newPage();

  let y = 90;
  drawText(ctx, input.orgName, w / 2, y, { size: 30, weight: 800, align: "center", color: "#8b1a1a" });
  y += 42;
  drawText(ctx, input.title, w / 2, y, { size: 22, weight: 700, align: "center" });
  y += 40;

  const L = input.labels;
  const kv = (k: string, v: string) => {
    drawText(ctx, `${k}:`, 80, y, { size: 16, weight: 600 });
    drawText(ctx, v, 300, y, { size: 16, weight: 400, maxWidth: w - 380 });
    y += 34;
  };
  kv(L.member, `${input.member.name} (${input.member.code})`);
  kv(L.date, input.date);
  if (input.member.phone) kv(L.phone, input.member.phone);
  if (input.member.email) kv(L.email, input.member.email);

  y += 12;
  drawText(ctx, L.oldLoan, 80, y, { size: 18, weight: 800, color: "#8b1a1a" });
  y += 30;
  kv(L.outstanding, input.outstanding);
  kv(L.monthly, input.monthlyInterest);

  y += 8;
  drawText(ctx, L.todaysEntry, 80, y, { size: 18, weight: 800, color: "#8b1a1a" });
  y += 30;
  kv(L.principalPaid, input.principalPaid);
  kv(L.interestPaid, input.interestPaid);
  kv(L.newLoan, input.newLoan);
  kv(L.newLoanRate, input.newLoanRate);
  if (input.remarks) kv(L.remarks, input.remarks);
  if (input.updatedBalance) {
    y += 6;
    drawText(ctx, `${L.updatedBalance}: ${input.updatedBalance}`, 80, y, { size: 18, weight: 800, color: "#138808" });
    y += 30;
  }

  drawText(ctx, "Download from MBR APP", w / 2, 1710, { size: 12, align: "center", color: "#666" });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  pdf.save(input.fileName);
}

export type MasterLedgerRow = {
  member_id: string;
  member_name: string;
  old_balance: number;
  principal_collected: number;
  interest_collected: number;
  new_loan: number;
  net_balance: number;
};
export type MasterLedgerTotals = {
  outstanding: number;
  principal: number;
  interest: number;
  newLoan: number;
  net: number;
};
export type MasterLedgerHeaders = {
  id: string; name: string; oldBal: string; principal: string; interest: string; newLoan: string; total: string;
};

export async function downloadMasterLedgerPdfCanvas(input: {
  orgName: string;
  title: string;
  dateText: string;
  rows: MasterLedgerRow[];
  totals: MasterLedgerTotals;
  headers: MasterLedgerHeaders;
  totalLabel: string;
  fmt: (n: number) => string;
  fileName: string;
}) {
  const { jsPDF } = await import("jspdf");
  await ensureFonts();

  const pageW = 1240, pageH = 1754;
  const marginX = 56;
  const headerH = 200, footerH = 78, thH = 42, rowH = 38, totalH = 44;

  const cols = [
    { label: input.headers.id, width: 92, align: "left" as CanvasTextAlign, get: (r: MasterLedgerRow) => r.member_id },
    { label: input.headers.name, width: 280, align: "left" as CanvasTextAlign, get: (r: MasterLedgerRow) => r.member_name },
    { label: input.headers.oldBal, width: 150, align: "right" as CanvasTextAlign, get: (r: MasterLedgerRow) => input.fmt(r.old_balance) },
    { label: input.headers.principal, width: 150, align: "right" as CanvasTextAlign, get: (r: MasterLedgerRow) => input.fmt(r.principal_collected) },
    { label: input.headers.interest, width: 150, align: "right" as CanvasTextAlign, get: (r: MasterLedgerRow) => input.fmt(r.interest_collected) },
    { label: input.headers.newLoan, width: 150, align: "right" as CanvasTextAlign, get: (r: MasterLedgerRow) => input.fmt(r.new_loan) },
    { label: input.headers.total, width: 156, align: "right" as CanvasTextAlign, get: (r: MasterLedgerRow) => input.fmt(r.net_balance), bold: true },
  ];
  const tableW = cols.reduce((s, c) => s + c.width, 0);
  const rowsPerPage = Math.max(1, Math.floor((pageH - headerH - footerH - thH - totalH) / rowH));
  const chunks = input.rows.length
    ? Array.from({ length: Math.ceil(input.rows.length / rowsPerPage) }, (_, i) => input.rows.slice(i * rowsPerPage, (i + 1) * rowsPerPage))
    : [[] as MasterLedgerRow[]];

  const cellText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, size: number, align: CanvasTextAlign, weight: number | string) => {
    const safeText = pdfText(text);
    let s = size; setFont(ctx, s, weight);
    while (s > 9 && ctx.measureText(safeText).width > w - 12) { s -= 1; setFont(ctx, s, weight); }
    ctx.fillStyle = "#111"; ctx.textAlign = align; ctx.textBaseline = "middle";
    const dx = align === "right" ? x + w - 8 : align === "center" ? x + w / 2 : x + 8;
    ctx.fillText(safeText, dx, y);
  };

  const pages: HTMLCanvasElement[] = [];
  chunks.forEach((chunk, pageIdx) => {
    const { canvas, ctx } = newPage(pageW, pageH);
    drawText(ctx, input.orgName, pageW / 2, 80, { size: 28, weight: 800, align: "center", color: "#8b1a1a" });
    drawText(ctx, input.title, pageW / 2, 118, { size: 20, weight: 700, align: "center" });
    drawText(ctx, input.dateText, pageW / 2, 148, { size: 14, align: "center", color: "#555" });

    // header row
    let x = marginX;
    let y = headerH;
    cols.forEach(c => {
      ctx.fillStyle = "#f4e6d0"; ctx.fillRect(x, y, c.width, thH);
      ctx.strokeStyle = "#b8b8b8"; ctx.strokeRect(x, y, c.width, thH);
      cellText(ctx, c.label, x, y + thH / 2, c.width, 13, c.align, 700);
      x += c.width;
    });
    y += thH;

    chunk.forEach((r, i) => {
      x = marginX;
      ctx.fillStyle = i % 2 ? "#ffffff" : "#fff7ed";
      ctx.fillRect(marginX, y, tableW, rowH);
      cols.forEach(c => {
        ctx.strokeStyle = "#c4c4c4"; ctx.strokeRect(x, y, c.width, rowH);
        cellText(ctx, c.get(r), x, y + rowH / 2, c.width, 13, c.align, (c as any).bold ? 700 : 400);
        x += c.width;
      });
      y += rowH;
    });

    if (pageIdx === chunks.length - 1) {
      x = marginX;
      ctx.fillStyle = "#dcfce7"; ctx.fillRect(marginX, y, tableW, totalH);
      const vals = [input.totalLabel, "", input.fmt(input.totals.outstanding), input.fmt(input.totals.principal), input.fmt(input.totals.interest), input.fmt(input.totals.newLoan), input.fmt(input.totals.net)];
      cols.forEach((c, i) => {
        ctx.strokeStyle = "#a8c8ad"; ctx.strokeRect(x, y, c.width, totalH);
        cellText(ctx, vals[i], x, y + totalH / 2, c.width, 14, i < 2 ? "left" : "right", 800);
        x += c.width;
      });
    }

    drawText(ctx, `Download from MBR APP · ${pageIdx + 1}/${chunks.length}`, pageW / 2, pageH - 40, { size: 12, align: "center", color: "#666" });
    pages.push(canvas);
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pages.forEach((cv, i) => {
    if (i > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(cv.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  });
  pdf.save(input.fileName);
}
