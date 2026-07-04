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
const ROWS_PER_PAGE = 21;

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

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  content?: string,
) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function image(doc: Document, src: string, className: string, alt: string) {
  const img = doc.createElement("img");
  img.className = className;
  img.alt = alt;
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";
  img.src = src;
  return img;
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}

function injectStyles(doc: Document) {
  const style = doc.createElement("style");
  style.textContent = `
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${A4_WIDTH_PX}px !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #111111 !important;
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box !important;
      color: inherit;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    .mbr-pdf-page {
      width: ${A4_WIDTH_PX}px;
      height: ${A4_HEIGHT_PX}px;
      padding: 42px 38px 34px;
      background: #ffffff;
      color: #111111;
      font-family: system-ui, -apple-system, "Noto Sans Telugu", "Segoe UI", Arial, sans-serif;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .mbr-pdf-header {
      text-align: center;
      border-bottom: 1px solid #d6d6d6;
      padding-bottom: 14px;
      margin-bottom: 16px;
      flex: 0 0 auto;
    }
    .mbr-pdf-logo {
      display: block;
      width: 92px;
      height: 92px;
      object-fit: contain;
      margin: 0 auto 8px;
    }
    .mbr-pdf-org {
      font-size: 21px;
      line-height: 1.25;
      font-weight: 800;
      color: #111111;
      margin: 0;
    }
    .mbr-pdf-title {
      font-size: 15px;
      line-height: 1.35;
      color: #222222;
      margin-top: 4px;
      font-weight: 700;
    }
    .mbr-pdf-meta {
      font-size: 10px;
      color: #555555;
      margin-top: 3px;
    }
    .mbr-pdf-table-wrap { flex: 1 1 auto; }
    .mbr-pdf-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      background: #ffffff;
      color: #111111;
      font-size: 10px;
    }
    .mbr-pdf-table th,
    .mbr-pdf-table td {
      border: 1px solid #cfcfcf;
      border-color: #cfcfcf;
      padding: 7px 6px;
      text-align: left;
      vertical-align: middle;
      overflow-wrap: anywhere;
      word-break: break-word;
      background: #ffffff;
      color: #111111;
    }
    .mbr-pdf-table th {
      background: #f2f2f2;
      font-weight: 800;
      font-size: 9.5px;
    }
    .mbr-pdf-table .center { text-align: center; }
    .mbr-pdf-footer {
      flex: 0 0 auto;
      height: 28px;
      display: flex;
      align-items: end;
      justify-content: center;
      gap: 6px;
      border-top: 1px solid #dddddd;
      margin-top: 14px;
      padding-top: 8px;
      color: #555555;
      font-size: 9px;
      line-height: 1;
    }
    .mbr-pdf-footer img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
  `;
  doc.head.appendChild(style);
}

function buildPage(
  doc: Document,
  members: MemberListPdfMember[],
  pageIndex: number,
  totalPages: number,
  options: MemberListPdfOptions,
) {
  const page = el(doc, "section", "mbr-pdf-page");
  const header = el(doc, "header", "mbr-pdf-header");
  const societyLogo = toAbsolute(options.logoUrl) || toAbsolute(mbrLogo.url);
  if (societyLogo) header.appendChild(image(doc, societyLogo, "mbr-pdf-logo", "Society logo"));
  header.appendChild(el(doc, "h1", "mbr-pdf-org", options.orgName || "Society"));
  header.appendChild(el(doc, "div", "mbr-pdf-title", "సభ్యుల జాబితా • Member List"));
  header.appendChild(el(doc, "div", "mbr-pdf-meta", `Total members: ${options.members.length} • Page ${pageIndex + 1} of ${totalPages}`));
  page.appendChild(header);

  const tableWrap = el(doc, "div", "mbr-pdf-table-wrap");
  const table = el(doc, "table", "mbr-pdf-table");
  const colgroup = doc.createElement("colgroup");
  ["8%", "14%", "27%", "22%", "17%", "12%"].forEach((width) => {
    const col = doc.createElement("col");
    col.style.width = width;
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  const thead = doc.createElement("thead");
  const headerRow = doc.createElement("tr");
  ["Serial No", "Member Code", "Name", "Father's Name", "Phone", "Status"].forEach((heading, index) => {
    const th = doc.createElement("th");
    th.textContent = heading;
    if (index === 0) th.className = "center";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = doc.createElement("tbody");
  members.forEach((member, rowIndex) => {
    const tr = doc.createElement("tr");
    const serial = pageIndex * ROWS_PER_PAGE + rowIndex + 1;
    [serial, member.member_code, member.name, member.father_name, member.phone, statusText(member)].forEach((value, index) => {
      const td = doc.createElement("td");
      td.textContent = text(value);
      if (index === 0) td.className = "center";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  page.appendChild(tableWrap);

  const footer = el(doc, "footer", "mbr-pdf-footer");
  footer.appendChild(image(doc, toAbsolute(mbrLogo.url), "", "MBR"));
  footer.appendChild(el(doc, "span", "", "Download from MBR APP"));
  page.appendChild(footer);

  return page;
}

function createRenderFrame() {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.top = "0";
  frame.style.width = `${A4_WIDTH_PX}px`;
  frame.style.height = `${A4_HEIGHT_PX}px`;
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.srcdoc = "<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>";
  document.body.appendChild(frame);
  return new Promise<HTMLIFrameElement>((resolve) => {
    frame.addEventListener("load", () => resolve(frame), { once: true });
  });
}

function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    });
  }));
}

export async function downloadMemberListPdf(options: MemberListPdfOptions) {
  const [{ default: html2canvas }, jsPdf] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const frame = await createRenderFrame();
  const doc = frame.contentDocument;
  if (!doc) throw new Error("PDF render document unavailable");
  doc.body.style.margin = "0";
  doc.body.style.padding = "0";
  doc.body.style.background = "#ffffff";
  doc.body.style.backgroundColor = "#ffffff";
  doc.body.style.color = "#111111";
  doc.documentElement.style.background = "#ffffff";
  doc.documentElement.style.backgroundColor = "#ffffff";
  doc.documentElement.style.color = "#111111";
  injectStyles(doc);

  const root = doc.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.width = `${A4_WIDTH_PX}px`;
  root.style.background = "#ffffff";

  const pages = chunk(options.members, ROWS_PER_PAGE);
  pages.forEach((pageMembers, pageIndex) => {
    root.appendChild(buildPage(doc, pageMembers, pageIndex, pages.length, options));
  });

  doc.body.appendChild(root);

  try {
    await waitForImages(root);
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));

    const pdf = new jsPdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageElements = Array.from(root.querySelectorAll<HTMLElement>(".mbr-pdf-page"));

    for (let i = 0; i < pageElements.length; i += 1) {
      const canvas = await html2canvas(pageElements[i], {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX,
      });
      const imgData = canvas.toDataURL("image/png");
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "FAST");
    }

    pdf.save(`member-list-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    frame.remove();
  }
}