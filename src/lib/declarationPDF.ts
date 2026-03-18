"use client";

import jsPDF from "jspdf";
import { COMPANY, POWER_STATIONS, TenderFormData } from "./constants";

// Load image as base64 data URL for jsPDF
export async function loadImageAsDataURL(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image: " + src));
    img.src = src;
  });
}

// ─── LETTERHEAD PDF RENDERER ──────────────────────────────────────────────────
// Renders the official Sterling Letter head.pdf to a high-res PNG for use as a
// full-page background on letterhead pages.
let _letterheadCache: string | null = null;

export async function renderLetterheadPNG(): Promise<string> {
  if (_letterheadCache) return _letterheadCache;

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const response = await fetch("/sterling-letterhead.pdf");
  const arrayBuffer = await response.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const page = await pdf.getPage(1);

  const scale = 3;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire canvas 2D context for letterhead rendering");

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  _letterheadCache = canvas.toDataURL("image/png");
  pdf.destroy();
  return _letterheadCache;
}

export function getStation(data: TenderFormData) {
  if (data.powerStationCode === "CUSTOM") {
    return {
      code: "CUSTOM",
      name: data.customStationName,
      address: data.customStationAddress,
      chiefEngineer: "The Chief Engineer",
    };
  }
  return POWER_STATIONS.find((s) => s.code === data.powerStationCode) || POWER_STATIONS[0];
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── LETTERHEAD HEADER ───────────────────────────────────────────────────────
// Places the full-page letterhead PDF (rendered as PNG) as a background image.
// The header, divider, and footer are all part of the background.
export function addLetterheadHeader(doc: jsPDF, letterheadDataUrl: string, pageWidth: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (letterheadDataUrl) {
    doc.addImage(letterheadDataUrl, "PNG", 0, 0, pageWidth, pageHeight);
  }

  // Reset colors for content drawn on top
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return 42; // y position below the header area (extra clearance for letterhead)
}

// ─── LETTERHEAD FOOTER ───────────────────────────────────────────────────────
// Footer is part of the full-page letterhead background — no-op.
export function addLetterheadFooter(_doc: jsPDF, _pageWidth: number, _pageHeight: number) {
  // No-op: footer is rendered as part of the letterhead PDF background image
}

// ─── INLINE BOLD HELPER ──────────────────────────────────────────────────────
// Renders wrapped paragraph text, making specific substrings (e.g. tender/RFx
// numbers) bold inline while the rest stays normal.
export function renderTextWithBoldParts(
  doc: jsPDF,
  fullText: string,
  boldParts: string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const activeBold = boldParts.filter((p) => p.length > 0);
  const lines: string[] = doc.splitTextToSize(fullText, maxWidth);

  lines.forEach((line: string, lineIdx: number) => {
    const lineY = y + lineIdx * lineHeight;
    let currentX = x;
    let remaining = line;

    while (remaining.length > 0) {
      // Find earliest bold part in remaining text
      let earliestIdx = remaining.length;
      let earliestPart = "";

      for (const part of activeBold) {
        const idx = remaining.indexOf(part);
        if (idx !== -1 && idx < earliestIdx) {
          earliestIdx = idx;
          earliestPart = part;
        }
      }

      if (earliestPart) {
        // Normal text before bold part
        if (earliestIdx > 0) {
          const before = remaining.substring(0, earliestIdx);
          doc.setFont("times", "normal");
          doc.text(before, currentX, lineY);
          currentX += doc.getTextWidth(before);
        }
        // Bold part
        doc.setFont("times", "bold");
        doc.text(earliestPart, currentX, lineY);
        currentX += doc.getTextWidth(earliestPart);
        doc.setFont("times", "normal");
        remaining = remaining.substring(earliestIdx + earliestPart.length);
      } else {
        doc.setFont("times", "normal");
        doc.text(remaining, currentX, lineY);
        remaining = "";
      }
    }
  });

  return lines.length;
}

// ─── STRIKETHROUGH HELPER ────────────────────────────────────────────────────
// Draws multi-line text. If `strike` is true, draws a horizontal line through
// each line of text (non-applicable option in the declaration).
function drawTextWithOptionalStrike(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  strike: boolean
) {
  doc.text(lines, x, y);

  if (strike) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    lines.forEach((_line, i) => {
      const lineY = y + i * lineHeight;
      const lineW = doc.getTextWidth(lines[i]);
      // Strike through the middle of the text (~1.2mm above baseline)
      doc.line(x, lineY - 1.2, x + lineW, lineY - 1.2);
    });
  }
}

// ─── CORE: Add declaration content to an existing jsPDF doc ──────────────────
export async function addDeclarationToDoc(
  doc: jsPDF,
  data: TenderFormData,
  letterheadDataUrl: string,
  stampDataUrl?: string,
  sig1DataUrl?: string,
  sig2DataUrl?: string
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const station = getStation(data);

  addLetterheadFooter(doc, pageWidth, pageHeight);
  let y = addLetterheadHeader(doc, letterheadDataUrl, pageWidth);
  y += 4;

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("UNDERTAKING TO BE SUBMITTED WITH TENDER", pageWidth / 2, y, { align: "center" });
  const titleW = doc.getTextWidth("UNDERTAKING TO BE SUBMITTED WITH TENDER");
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - titleW / 2, y + 0.8, pageWidth / 2 + titleW / 2, y + 0.8);
  y += 8;

  // Date (top right)
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.text(`Date- ${formatDate(data.date)}`, pageWidth - margin, y, { align: "right" });
  y += 7;

  // To block
  doc.text("To,", margin, y); y += 5;
  doc.setFont("times", "bold");
  doc.text(station.chiefEngineer, margin, y); y += 5;
  doc.setFont("times", "normal");
  doc.text(station.name, margin, y); y += 5;
  const addrLines = doc.splitTextToSize(station.address, contentWidth * 0.6);
  addrLines.forEach((line: string) => { doc.text(line, margin, y); y += 5; });
  y += 3;

  // Dear Sir
  doc.setFont("times", "bold");
  doc.text("Dear Sir,", margin, y); y += 7;

  // Opening paragraph
  doc.setFont("times", "normal");
  const tenderDate = data.tenderIssueDate
    ? formatDate(data.tenderIssueDate)
    : (data.date ? formatDate(data.date) : "[Date]");

  const opening = `In accordance with your Tender for ${data.tenderDescription || "[Description of tender items]"}, under your Tender No. ${data.tenderNumber || "[Tender Number]"} dated ${tenderDate} M/s. ${COMPANY.name} (Hereinafter called the Bidder) hereby submit the undertaking as under:`;
  const openLineCount = renderTextWithBoldParts(
    doc, opening,
    [data.tenderNumber, data.rfxNumber].filter(Boolean),
    margin, y, contentWidth, 5.5
  );
  y += openLineCount * 5.5 + 5;

  // General statement (always present)
  const pGeneral = `The Bidder commits to undertake all measures necessary to follow Orders issued by Ministry of Power, Govt. of India (Num. 25 – 11 / 6 /2018 - PG Dt: 02-07-2020 & Num: No. 9 / 16 / 2016-Trans - Part (2) Dt: 18-11-2020 and / or subsequent orders / amendments if any) regarding testing of equipment, components, and parts imported for use in the Power Supply System and Network for any kind of embedded Malware / Trojans / Cyber Threat and for adherence to Indian Standards.`;
  const pGeneralLines = doc.splitTextToSize(pGeneral, contentWidth);
  doc.text(pGeneralLines, margin, y);
  y += pGeneralLines.length * 5.5 + 5;

  // --- Option A: Imported supply ---
  const supplier = data.importSupplier || "[Supplier / Country of Origin]";
  const pImported = `Equipment / components / parts to be supplied will be imported from ${supplier} and as such the same will be supplied by following prevailing directives issued by the Ministry of Power and any other statutory authorities for such imports. The necessary Test Certificates, regarding any kind of embedded Malware / Trojans / Cyber Threat and for adherence to Indian Standards, issued by the approved Laboratories will be provided while supplying the tendered material. Also copies of Permissions accorded by the statutory authorities for such import will also be provided any time, if asked for the same by the Purchasing Authorities.`;
  const pImportedLines = doc.splitTextToSize(pImported, contentWidth);
  const strikeImported = data.supplyType !== "imported";
  drawTextWithOptionalStrike(doc, pImportedLines, margin, y, 5.5, strikeImported);
  y += pImportedLines.length * 5.5 + 4;

  // "OR" centered between the two options
  doc.setFont("times", "bold");
  doc.text("OR", pageWidth / 2, y, { align: "center" });
  doc.setFont("times", "normal");
  y += 6;

  // --- Option B: Indigenous supply ---
  const pIndigenous = `No any equipment / components / parts to be supplied will be imported & the tendered material will be supplied indigenously and as such directives issued by the Ministry of Power or any other statutory authorities regarding imported items will not be applicable for such supplies.`;
  const pIndigenousLines = doc.splitTextToSize(pIndigenous, contentWidth);
  const strikeIndigenous = data.supplyType !== "indigenous";
  drawTextWithOptionalStrike(doc, pIndigenousLines, margin, y, 5.5, strikeIndigenous);
  y += pIndigenousLines.length * 5.5 + 5;

  // Non-compliance warning
  const p3 = `The bidder has understood that non-compliance of the order (Num. 25 – 11 / 6 /2018 - PG Dt: 02-07-2020 & Num: No. 9 / 16 / 2016-Trans - Part (2) Dt: 18-11-2020 and / or subsequent orders / amendments if any), at any stage of Tendering Process / Order execution, may lead to disqualification from the tendering process / termination of Purchase Order / Contract and this shall lead to forfeiture of EMD / SD / Performance Deposit, as the case may be.`;
  const p3Lines = doc.splitTextToSize(p3, contentWidth);
  doc.text(p3Lines, margin, y);
  y += p3Lines.length * 5.5 + 5;

  // Contract clause
  doc.setFont("times", "italic");
  doc.text("This undertaking shall form a part of the contract.", margin, y);
  y += 10;

  // Page overflow: stamp + signature + witnesses need ~85mm.
  // Footer occupies bottom ~18mm, so usable area ends at ~279mm.
  const FOOTER_ZONE = 297 * 0.08; // ~24mm footer
  const SIG_BLOCK_NEED = 85; // stamp + date/place + name + witnesses
  if (y + SIG_BLOCK_NEED > pageHeight - FOOTER_ZONE) {
    doc.addPage();
    // Overflow page is plain — no letterhead header/footer
    y = 20;
  }

  // Stamp above signature block (right side, centered over signature)
  if (stampDataUrl) {
    const stampSize = 28; // 28mm x 28mm
    doc.addImage(stampDataUrl, "PNG", pageWidth - margin - stampSize - 10, y - 4, stampSize, stampSize);
  }

  // Signature block
  doc.setFont("times", "normal");
  doc.text(`Date- ${formatDate(data.date)}`, margin, y + 20);
  doc.setFont("times", "bold");
  doc.text("AKHIL BAHALE", pageWidth - margin, y + 20, { align: "right" });
  y += 25;
  doc.setFont("times", "normal");
  doc.text("Place- Nagpur", margin, y);
  doc.text("PROPRIETOR", pageWidth - margin, y, { align: "right" });
  y += 12;

  // Witnesses
  doc.setFont("times", "bold");
  doc.text("In presence of:", margin, y); y += 5;
  doc.setFont("times", "normal");
  doc.text("WITNESS (with full name, designation, address & official seal, if any)", margin, y); y += 8;

  // Witness 1 with signature
  doc.text(`(1) ${COMPANY.witnesses[0]}`, margin, y);
  if (sig1DataUrl) {
    doc.addImage(sig1DataUrl, "PNG", margin + 110, y - 6, 30, 10);
  }
  y += 12;

  // Witness 2 with signature
  doc.text(`(2) ${COMPANY.witnesses[1]}`, margin, y);
  if (sig2DataUrl) {
    doc.addImage(sig2DataUrl, "PNG", margin + 110, y - 6, 30, 10);
  }
}

// ─── Load all Sterling images ─────────────────────────────────────────────────
export async function loadSterlingImages() {
  const [letterheadDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl] = await Promise.all([
    renderLetterheadPNG(),
    loadImageAsDataURL("/sterling-stamp.png"),
    loadImageAsDataURL("/sterling-sig1.png"),
    loadImageAsDataURL("/sterling-sig2.png"),
  ]);
  return { letterheadDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl };
}

// ─── STANDALONE: Generate Declaration as its own PDF ─────────────────────────
export async function generateDeclarationPDF(data: TenderFormData): Promise<void> {
  const { letterheadDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl } = await loadSterlingImages();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await addDeclarationToDoc(doc, data, letterheadDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl);
  doc.save(`Sterling_Declaration_${data.tenderNumber || data.rfxNumber || "doc"}.pdf`);
}
