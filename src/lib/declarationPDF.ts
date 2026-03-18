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

// ─── RENDER LETTERHEAD FROM PDF ───────────────────────────────────────────────
// Renders BOTH the header and footer from the official Sterling letterhead PDF.
// Header = top portion (logo + company name + divider)
// Footer = bottom portion (address, email, website, GST)
// Both are cached after first render.
let _headerCache: string | null = null;
let _footerCache: string | null = null;

export async function loadLetterheadFromPDF(): Promise<string> {
  if (_headerCache) return _headerCache;

  // Dynamic import — only runs in browser, avoids SSR issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument("/sterling-letterhead.pdf").promise;
  const page = await pdf.getPage(1);

  // Render at 4× scale for print-quality output (~288 DPI)
  const scale = 4;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Crop HEADER: top 10% of A4 (logo + company name + divider ≈ 30mm)
  const headerRatio = 0.10;
  const headerPixelH = Math.floor(viewport.height * headerRatio);
  const hCrop = document.createElement("canvas");
  hCrop.width = viewport.width;
  hCrop.height = headerPixelH;
  const hCtx = hCrop.getContext("2d")!;
  hCtx.drawImage(canvas, 0, 0, viewport.width, headerPixelH, 0, 0, viewport.width, headerPixelH);
  _headerCache = hCrop.toDataURL("image/png");

  // Crop FOOTER: bottom 6% of A4 (address + email + GST ≈ 18mm)
  const footerRatio = 0.06;
  const footerPixelH = Math.floor(viewport.height * footerRatio);
  const footerStartY = viewport.height - footerPixelH;
  const fCrop = document.createElement("canvas");
  fCrop.width = viewport.width;
  fCrop.height = footerPixelH;
  const fCtx = fCrop.getContext("2d")!;
  fCtx.drawImage(canvas, 0, footerStartY, viewport.width, footerPixelH, 0, 0, viewport.width, footerPixelH);
  _footerCache = fCrop.toDataURL("image/png");

  pdf.destroy();
  return _headerCache;
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
// Places the pre-rendered letterhead PDF header image at the top of the page.
// New letterhead: logo left-aligned + company name + blue divider (compact ~30mm)
export function addLetterheadHeader(doc: jsPDF, letterheadDataUrl: string, pageWidth: number): number {
  // Header image = top 10% of A4 page ≈ 30mm
  const HEADER_HEIGHT_MM = 297 * 0.10; // ~29.7mm

  if (letterheadDataUrl) {
    doc.addImage(letterheadDataUrl, "PNG", 0, 0, pageWidth, HEADER_HEIGHT_MM);
  }

  return HEADER_HEIGHT_MM + 2; // content starts ~32mm from top
}

// ─── LETTERHEAD FOOTER ───────────────────────────────────────────────────────
// Places the pre-rendered letterhead PDF footer image at the bottom of the page.
// Uses the cached footer from loadLetterheadFromPDF().
export function addLetterheadFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  // Footer image = bottom 6% of A4 page ≈ 18mm
  const FOOTER_HEIGHT_MM = 297 * 0.06; // ~17.8mm

  if (_footerCache) {
    doc.addImage(_footerCache, "PNG", 0, pageHeight - FOOTER_HEIGHT_MM, pageWidth, FOOTER_HEIGHT_MM);
  }
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
    loadLetterheadFromPDF(),
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
