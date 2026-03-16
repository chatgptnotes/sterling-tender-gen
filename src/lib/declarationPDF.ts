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
// Matches the official Sterling letterhead PDF exactly:
// - Logo image centered at top (if available)
// - Company name in red bold, centered, with red underline
// - Address in black bold centered
// - Email centered (label bold black, value blue)
// - Website + Contact on same line centered
// - Red horizontal divider line
export function addLetterheadHeader(doc: jsPDF, logoDataUrl: string, pageWidth: number): number {
  const margin = 15;
  const RED: [number, number, number] = [212, 32, 39];   // #D42027
  const BLUE: [number, number, number] = [5, 99, 193];   // #0563C1
  const BLACK: [number, number, number] = [0, 0, 0];

  let y = 8;

  // Logo — centered at top if available
  if (logoDataUrl) {
    const logoW = 35;
    const logoH = 16;
    doc.addImage(logoDataUrl, "PNG", pageWidth / 2 - logoW / 2, y, logoW, logoH);
    y += logoH + 3;
  } else {
    y += 5;
  }

  // Company name — red bold centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...RED);
  doc.text("STERLING ELECTRICALS & TECHNOLOGIES", pageWidth / 2, y, { align: "center" });
  // Red underline
  const nameW = doc.getTextWidth("STERLING ELECTRICALS & TECHNOLOGIES");
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - nameW / 2, y + 1, pageWidth / 2 + nameW / 2, y + 1);
  y += 7;

  // Address — black bold centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("PLOT N0 1-A, ARYA NAGAR, BEHIND KORADI NAKA, NAGPUR-440 030", pageWidth / 2, y, { align: "center" });
  y += 5;

  // Email — "E-mail- " black bold + email blue underlined
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const emailLabel = "E-mail- ";
  const emailValue = "akhilbahale@rediffmail.com";
  const emailLabelW = doc.getTextWidth(emailLabel);
  const emailValueW = doc.getTextWidth(emailValue);
  const emailTotalW = emailLabelW + emailValueW;
  const emailStartX = pageWidth / 2 - emailTotalW / 2;
  doc.text(emailLabel, emailStartX, y);
  doc.setTextColor(...BLUE);
  doc.text(emailValue, emailStartX + emailLabelW, y);
  doc.setLineWidth(0.3);
  doc.line(emailStartX + emailLabelW, y + 0.8, emailStartX + emailLabelW + emailValueW, y + 0.8);
  y += 5;

  // Website + Contact — on same line, centered as a group
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const webContact = "Website: www.sterlingtech.in          Contact No- 7972534245, 9730005841";
  doc.text(webContact, pageWidth / 2, y, { align: "center" });
  y += 5;

  // Red horizontal divider line
  doc.setDrawColor(...RED);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Reset colors
  doc.setTextColor(...BLACK);
  doc.setDrawColor(...BLACK);

  return y;
}

// ─── LETTERHEAD FOOTER ───────────────────────────────────────────────────────
export function addLetterheadFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const margin = 15;
  const footerY = pageHeight - 14;
  const RED: [number, number, number] = [212, 32, 39];

  // Red top line for footer
  doc.setDrawColor(...RED);
  doc.setLineWidth(1);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text(`Address- ${COMPANY.address}`, pageWidth / 2, footerY + 1, { align: "center" });
  doc.text(
    `E-mail- ${COMPANY.email}  |  Website: ${COMPANY.website}  |  Contact No- ${COMPANY.contact}  |  GST No.: ${COMPANY.gst}`,
    pageWidth / 2, footerY + 5, { align: "center" }
  );
  doc.setDrawColor(0, 0, 0);
}

// ─── CORE: Add declaration content to an existing jsPDF doc ──────────────────
export async function addDeclarationToDoc(
  doc: jsPDF,
  data: TenderFormData,
  logoDataUrl: string,
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
  let y = addLetterheadHeader(doc, logoDataUrl, pageWidth);
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
  const openLines = doc.splitTextToSize(opening, contentWidth);
  doc.text(openLines, margin, y);
  y += openLines.length * 5.5 + 5;

  // Supply type paragraph
  if (data.supplyType === "imported") {
    const p1 = `The Bidder commits to undertake all measures necessary to follow Orders issued by Ministry of Power, Govt. of India (Num. 25 – 11 / 6 /2018 - PG Dt: 02-07-2020 & Num: No. 9 / 16 / 2016-Trans - Part (2) Dt: 18-11-2020 and / or subsequent orders / amendments if any) regarding testing of equipment, components, and parts imported for use in the Power Supply System and Network for any kind of embedded Malware / Trojans / Cyber Threat and for adherence to Indian Standards.`;
    const p1Lines = doc.splitTextToSize(p1, contentWidth);
    doc.text(p1Lines, margin, y);
    y += p1Lines.length * 5.5 + 5;

    const supplier = data.importSupplier || "[Supplier / Country of Origin]";
    const p1b = `Equipment / components / parts to be supplied will be imported from ${supplier} and as such the same will be supplied by following prevailing directives issued by the Ministry of Power and any other statutory authorities for such imports. The necessary Test Certificates, regarding any kind of embedded Malware / Trojans / Cyber Threat and for adherence to Indian Standards, issued by the approved Laboratories will be provided while supplying the tendered material. Also copies of Permissions accorded by the statutory authorities for such import will also be provided any time, if asked for the same by the Purchasing Authorities.`;
    const p1bLines = doc.splitTextToSize(p1b, contentWidth);
    doc.text(p1bLines, margin, y);
    y += p1bLines.length * 5.5 + 5;
  } else {
    const p2 = `No any equipment / components / parts to be supplied will be imported & the tendered material will be supplied indigenously and as such directives issued by the Ministry of Power or any other statutory authorities regarding imported items will not be applicable for such supplies.`;
    const p2Lines = doc.splitTextToSize(p2, contentWidth);
    doc.text(p2Lines, margin, y);
    y += p2Lines.length * 5.5 + 5;
  }

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
  const [logoDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl] = await Promise.all([
    loadImageAsDataURL("/sterling-logo.png"),
    loadImageAsDataURL("/sterling-stamp.png"),
    loadImageAsDataURL("/sterling-sig1.png"),
    loadImageAsDataURL("/sterling-sig2.png"),
  ]);
  return { logoDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl };
}

// ─── STANDALONE: Generate Declaration as its own PDF ─────────────────────────
export async function generateDeclarationPDF(data: TenderFormData): Promise<void> {
  const { logoDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl } = await loadSterlingImages();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await addDeclarationToDoc(doc, data, logoDataUrl, stampDataUrl, sig1DataUrl, sig2DataUrl);
  doc.save(`Sterling_Declaration_${data.tenderNumber || data.rfxNumber || "doc"}.pdf`);
}
