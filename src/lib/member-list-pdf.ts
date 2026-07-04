import mbrLogo from "@/assets/mbr-logo.png.asset.json";

export type MemberListPdfMember = {
  member_code?: string | null;
  name?: string | null;
  father_name?: string | null;
  phone?: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

export type MemberListPdfOptions = {
  orgName: string;
  logoUrl?: string | null;
  members: MemberListPdfMember[];
};

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CANVAS_SCALE = 2;
const ROWS_PER_PAGE = 21;
const PAGE_MARGIN = 38;

function toAbsolute(url?: string | null) {
  if (!url) return "";
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

function text(value: unknown) {
  const v = String(value ?? "").trim();
  return v || "-";
}

function statusText(member: MemberListPdfMember) {
  const status = text(member.status).replace(/^./, (c) => c.toUpperCase());
  if (member.status === "approved") return member.is_active === false ? "Inactive" : "Active";
  return status;
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function safeImageSrc(url?: string | null) {
  const absolute = toAbsolute(url);
  if (!absolute) return "";
  if (absolute.startsWith("data:")) return absolute;
  try {
    const response = await fetch(absolute, { mode: "cors", credentials: "omit" });
    if (!response.ok) return "";
    return await blobToDataUrl(await response.blob());
  } catch {
    return "";
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!img) return;
  const ratio = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const drawW = img.naturalWidth * ratio;
  const drawH = img.naturalHeight * ratio;
  ctx.drawImage(img, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function truncateToWidth(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let out = value;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

function wrapText(ctx: CanvasRenderingContext2D, value: unknown, maxWidth: number, maxLines = 2) {
  const raw = text(value);
  const words = raw.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of words.length ? words : [raw]) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    pushCurrent();
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      continue;
    }
    let piece = "";
    for (const ch of Array.from(word)) {
      if (ctx.measureText(piece + ch).width <= maxWidth) piece += ch;
      else {
        if (piece) lines.push(piece);
        piece = ch;
      }
      if (lines.length >= maxLines) break;
    }
    current = piece;
    if (lines.length >= maxLines) break;
  }
  pushCurrent();

  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1], maxWidth);
  }
  if (lines.length === maxLines) lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1], maxWidth);
  return lines.slice(0, maxLines);
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  value: unknown,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
  align: CanvasTextAlign = "left",
) {
  const lines = wrapText(ctx, value, maxWidth, maxLines);
  ctx.textAlign = align;
  const drawX = align === "center" ? x + maxWidth / 2 : x;
  lines.forEach((line, index) => ctx.fillText(line, drawX, y + index * lineHeight));
}

function drawPage(
  pageMembers: MemberListPdfMember[],
  pageIndex: number,
  totalPages: number,
  options: MemberListPdfOptions,
  societyLogo: HTMLImageElement | null,
  footerLogo: HTMLImageElement | null,
) {
  const canvas = document.createElement("canvas");
  canvas.width = A4_WIDTH_PX * CANVAS_SCALE;
  canvas.height = A4_HEIGHT_PX * CANVAS_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF canvas unavailable");
  ctx.scale(CANVAS_SCALE, CANVAS_SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);
  ctx.textBaseline = "top";
  ctx.lineJoin = "miter";

  const logoSize = 92;
  drawContainedImage(ctx, societyLogo || footerLogo, (A4_WIDTH_PX - logoSize) / 2, 42, logoSize, logoSize);

  ctx.fillStyle = "#111111";
  ctx.font = '800 21px "Noto Sans Telugu", "Segoe UI", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(truncateToWidth(ctx, options.orgName || "Society", 620), A4_WIDTH_PX / 2, 142);

  ctx.font = '700 15px "Noto Sans Telugu", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = "#222222";
  ctx.fillText("సభ్యుల జాబితా • Member List", A4_WIDTH_PX / 2, 171);

  ctx.font = '400 10px "Noto Sans Telugu", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = "#555555";
  ctx.fillText(`Total members: ${options.members.length} • Page ${pageIndex + 1} of ${totalPages}`, A4_WIDTH_PX / 2, 193);

  ctx.strokeStyle = "#d6d6d6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAGE_MARGIN, 214);
  ctx.lineTo(A4_WIDTH_PX - PAGE_MARGIN, 214);
  ctx.stroke();

  const tableX = PAGE_MARGIN;
  const tableY = 235;
  const tableW = A4_WIDTH_PX - PAGE_MARGIN * 2;
  const widths = [58, 100, 194, 158, 122, tableW - 58 - 100 - 194 - 158 - 122];
  const headers = ["Serial No", "Member Code", "Name", "Father's Name", "Phone", "Status"];
  const headerH = 30;
  const rowH = 34;

  ctx.font = '800 9.5px "Noto Sans Telugu", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(tableX, tableY, tableW, headerH);
  ctx.strokeStyle = "#cfcfcf";
  ctx.fillStyle = "#111111";
  let x = tableX;
  headers.forEach((header, index) => {
    ctx.strokeRect(x, tableY, widths[index], headerH);
    drawTextBlock(ctx, header, x + 6, tableY + 9, widths[index] - 12, 11, 1, index === 0 ? "center" : "left");
    x += widths[index];
  });

  ctx.font = '400 10px "Noto Sans Telugu", "Segoe UI", Arial, sans-serif';
  pageMembers.forEach((member, rowIndex) => {
    const rowY = tableY + headerH + rowIndex * rowH;
    const values = [
      pageIndex * ROWS_PER_PAGE + rowIndex + 1,
      member.member_code,
      member.name,
      member.father_name,
      member.phone,
      statusText(member),
    ];
    let cellX = tableX;
    values.forEach((value, index) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cellX, rowY, widths[index], rowH);
      ctx.strokeStyle = "#cfcfcf";
      ctx.strokeRect(cellX, rowY, widths[index], rowH);
      ctx.fillStyle = "#111111";
      drawTextBlock(ctx, value, cellX + 6, rowY + 8, widths[index] - 12, 11, 2, index === 0 ? "center" : "left");
      cellX += widths[index];
    });
  });

  const footerY = A4_HEIGHT_PX - 62;
  ctx.strokeStyle = "#dddddd";
  ctx.beginPath();
  ctx.moveTo(PAGE_MARGIN, footerY);
  ctx.lineTo(A4_WIDTH_PX - PAGE_MARGIN, footerY);
  ctx.stroke();

  const footerText = "Download from MBR APP";
  ctx.font = '400 9px "Noto Sans Telugu", "Segoe UI", Arial, sans-serif';
  const footerTextWidth = ctx.measureText(footerText).width;
  const footerLogoSize = 16;
  const footerGap = 6;
  const footerStart = (A4_WIDTH_PX - footerLogoSize - footerGap - footerTextWidth) / 2;
  drawContainedImage(ctx, footerLogo, footerStart, footerY + 18, footerLogoSize, footerLogoSize);
  ctx.fillStyle = "#555555";
  ctx.textAlign = "left";
  ctx.fillText(footerText, footerStart + footerLogoSize + footerGap, footerY + 21);

  return canvas;
}

export async function downloadMemberListPdf(options: MemberListPdfOptions) {
  const jsPdf = await import("jspdf");
  await document.fonts?.ready;

  const mbrSrc = await safeImageSrc(mbrLogo.url);
  const logoSrc = await safeImageSrc(options.logoUrl) || mbrSrc;
  const [societyLogo, footerLogo] = await Promise.all([
    loadImage(logoSrc),
    loadImage(mbrSrc),
  ]);

  const pages = chunk(options.members, ROWS_PER_PAGE);
  const pdf = new jsPdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  pages.forEach((pageMembers, index) => {
    const canvas = drawPage(pageMembers, index, pages.length, options, societyLogo, footerLogo);
    if (index > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "FAST");
  });

  pdf.save(`member-list-${new Date().toISOString().slice(0, 10)}.pdf`);
}