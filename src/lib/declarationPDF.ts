"use client";

import jsPDF from "jspdf";
import { COMPANY, POWER_STATIONS, TenderFormData } from "./constants";

// Load image as base64 data URL for jsPDF
async function loadImageAsDataURL(src: string): Promise<string> {
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

function getStation(data: TenderFormData) {
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── LETTERHEAD HEADER ──────────────────────────────────────────────────────
function addLetterheadHeader(
  doc: jsPDF,
  logoDataUrl: string,
  pageWidth: number
): number {
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Logo: left side, ~44mm wide x 12mm tall (matching original EMU dimensions)
  const logoW = 38;
  const logoH = 12;
  doc.addImage(logoDataUrl, "PNG", margin, 8, logoW, logoH);

  // Company name: to the right of logo, centered in remaining space
  const textX = margin + logoW + 4;
  const textWidth = pageWidth - margin - textX;
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("STERLING ELECTRICALS", textX + textWidth / 2, 12, { align: "center" });
  doc.text("& TECHNOLOGIES", textX + textWidth / 2, 18, { align: "center" });

  // Thin horizontal divider line below header (full width, like the original)
  const lineY = 23;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, lineY, pageWidth - margin, lineY);
  // Second thin line just below
  doc.setLineWidth(0.3);
  doc.line(margin, lineY + 1.5, pageWidth - margin, lineY + 1.5);

  return lineY + 5; // return Y after header
}

// ─── LETTERHEAD FOOTER ───────────────────────────────────────────────────────
function addLetterheadFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const margin = 15;
  const footerY = pageHeight - 14;

  // Top border line above footer
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 1.5, pageWidth - margin, footerY - 1.5);

  // Footer text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  const footerLine1 = `Address- ${COMPANY.address}`;
  const footerLine2 = `E-mail- ${COMPANY.email},  Website: ${COMPANY.website},  Contact No- ${COMPANY.contact},  GST No.: ${COMPANY.gst}`;
  doc.text(footerLine1, pageWidth / 2, footerY + 1, { align: "center" });
  doc.text(footerLine2, pageWidth / 2, footerY + 5, { align: "center" });
}

// ─── DECLARATION / UNDERTAKING ───────────────────────────────────────────────
export async function generateDeclarationPDF(data: TenderFormData): Promise<void> {
  const logoDataUrl = await loadImageAsDataURL("/sterling-logo.png");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  const station = getStation(data);

  addLetterheadFooter(doc, pageWidth, pageHeight);
  let y = addLetterheadHeader(doc, logoDataUrl, pageWidth);

  y += 4;

  // ── Title ──
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("UNDERTAKING TO BE SUBMITTED WITH TENDER", pageWidth / 2, y, { align: "center" });
  // Underline
  const titleW = doc.getTextWidth("UNDERTAKING TO BE SUBMITTED WITH TENDER");
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - titleW / 2, y + 0.8, pageWidth / 2 + titleW / 2, y + 0.8);
  y += 8;

  // ── Date ──
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.text(`Date- ${formatDate(data.date)}`, pageWidth - margin, y, { align: "right" });
  y += 7;

  // ── To block ──
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.text("To,", margin, y); y += 5;
  doc.setFont("times", "bold");
  doc.text(station.chiefEngineer, margin, y); y += 5;
  doc.setFont("times", "normal");
  doc.text(station.name, margin, y); y += 5;

  // Split address across lines if needed
  const addrLines = doc.splitTextToSize(station.address, contentWidth * 0.6);
  addrLines.forEach((line: string) => { doc.text(line, margin, y); y += 5; });
  y += 3;

  // ── Dear Sir ──
  doc.setFont("times", "bold");
  doc.text("Dear Sir,", margin, y); y += 7;

  // ── Opening paragraph ──
  doc.setFont("times", "normal");
  const descText = data.tenderDescription || "[Description of tender items]";
  const tenderNo = data.tenderNumber || "[Tender Number]";
  const tenderDate = data.tenderIssueDate ? formatDate(data.tenderIssueDate) : (data.date ? formatDate(data.date) : "[Date]");

  const opening = `In accordance with your Tender for ${descText}, under your Tender No. ${tenderNo} dated ${tenderDate} M/s. ${COMPANY.name} (Hereinafter called the Bidder) hereby submit the undertaking as under:`;
  const openLines = doc.splitTextToSize(opening, contentWidth);
  doc.text(openLines, margin, y);
  y += openLines.length * 5.5 + 5;

  // ── Supply type: Imported or Indigenous ──
  doc.setFont("times", "normal");

  if (data.supplyType === "imported") {
    // Para A: Imported items
    const para1 = `The Bidder commits to undertake all measures necessary to follow Orders issued by Ministry of Power, Govt. of India (Num. 25 – 11 / 6 /2018 - PG Dt: 02-07-2020 & Num: No. 9 / 16 / 2016-Trans - Part (2) Dt: 18-11-2020 and / or subsequent orders / amendments if any) regarding testing of equipment, components, and parts imported for use in the Power Supply System and Network for any kind of embedded Malware / Trojans / Cyber Threat and for adherence to Indian Standards.`;
    const para1Lines = doc.splitTextToSize(para1, contentWidth);
    doc.text(para1Lines, margin, y);
    y += para1Lines.length * 5.5 + 5;

    const supplier = data.importSupplier || "[Supplier / Country of Origin]";
    const para1b = `Equipment / components / parts to be supplied will be imported from ${supplier} and as such the same will be supplied by following prevailing directives issued by the Ministry of Power and any other statutory authorities for such imports. The necessary Test Certificates, regarding any kind of embedded Malware / Trojans / Cyber Threat and for adherence to Indian Standards, issued by the approved Laboratories will be provided while supplying the tendered material. Also copies of Permissions accorded by the statutory authorities for such import will also be provided any time, if asked for the same by the Purchasing Authorities.`;
    const para1bLines = doc.splitTextToSize(para1b, contentWidth);
    doc.text(para1bLines, margin, y);
    y += para1bLines.length * 5.5 + 5;
  } else {
    // Para B: Indigenous supply
    const para2 = `No any equipment / components / parts to be supplied will be imported & the tendered material will be supplied indigenously and as such directives issued by the Ministry of Power or any other statutory authorities regarding imported items will not be applicable for such supplies.`;
    const para2Lines = doc.splitTextToSize(para2, contentWidth);
    doc.text(para2Lines, margin, y);
    y += para2Lines.length * 5.5 + 5;
  }

  // Non-compliance warning
  const para3 = `The bidder has understood that non-compliance of the order (Num. 25 – 11 / 6 /2018 - PG Dt: 02-07-2020 & Num: No. 9 / 16 / 2016-Trans - Part (2) Dt: 18-11-2020 and / or subsequent orders / amendments if any), at any stage of Tendering Process / Order execution, may lead to disqualification from the tendering process / termination of Purchase Order / Contract and this shall lead to forfeiture of EMD / SD / Performance Deposit, as the case may be.`;
  const para3Lines = doc.splitTextToSize(para3, contentWidth);
  doc.text(para3Lines, margin, y);
  y += para3Lines.length * 5.5 + 5;

  // Contract clause
  doc.setFont("times", "italic");
  doc.text("This undertaking shall form a part of the contract.", margin, y);
  y += 10;

  // ── Date & Signature ──
  doc.setFont("times", "normal");
  doc.text(`Date- ${formatDate(data.date)}`, margin, y); y += 5;
  doc.text("Place- Nagpur", margin, y);
  doc.setFont("times", "bold");
  doc.text("AKHIL BAHALE", pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.setFont("times", "normal");
  doc.text("PROPRIETOR", pageWidth - margin, y, { align: "right" });
  y += 10;

  // ── Witness section ──
  doc.setFont("times", "bold");
  doc.text("In presence of:", margin, y); y += 5;
  doc.setFont("times", "normal");
  doc.text("WITNESS (with full name, designation, address & official seal, if any)", margin, y); y += 6;
  doc.text(`1. ${COMPANY.witnesses[0]}`, margin, y); y += 6;
  doc.text(`2. ${COMPANY.witnesses[1]}`, margin, y);

  doc.save(`Sterling_Declaration_${data.tenderNumber || data.rfxNumber || "doc"}.pdf`);
}
