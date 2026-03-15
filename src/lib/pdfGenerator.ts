"use client";

import jsPDF from "jspdf";
import { COMPANY, POWER_STATIONS, TenderFormData } from "./constants";

const ORANGE = [249, 115, 22] as const;
const NAVY = [30, 58, 95] as const;
const BLACK = [0, 0, 0] as const;
const GRAY = [100, 100, 100] as const;
const LIGHT_GRAY = [240, 240, 240] as const;
const WHITE = [255, 255, 255] as const;

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
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function addHeader(doc: jsPDF, pageWidth: number) {
  // Orange top bar
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, 14, "F");

  // Company name in white
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text(COMPANY.name, pageWidth / 2, 9, { align: "center" });

  // Navy detail bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 14, pageWidth, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(COMPANY.address, pageWidth / 2, 19, { align: "center" });
  doc.text(
    `GST: ${COMPANY.gst}  |  Ph: ${COMPANY.contact}  |  ${COMPANY.email}  |  ${COMPANY.website}`,
    pageWidth / 2,
    23,
    { align: "center" }
  );

  return 28; // return Y position after header
}

function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setFillColor(...NAVY);
  doc.rect(0, pageHeight - 10, pageWidth, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(
    "drmhope.com | A Bettroi Product",
    pageWidth / 2,
    pageHeight - 4,
    { align: "center" }
  );
}

function addSectionTitle(doc: jsPDF, title: string, y: number, pageWidth: number): number {
  doc.setFillColor(...ORANGE);
  doc.rect(10, y, pageWidth - 20, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(title, pageWidth / 2, y + 5, { align: "center" });
  return y + 10;
}

function addLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth = 50) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(label + ":", x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);
  doc.text(value || "-", x + labelWidth, y);
}

// ============================================================
// DOCUMENT 1: SELF DECLARATION
// ============================================================
export function generateSelfDeclaration(doc: jsPDF, data: TenderFormData, startY: number, pageWidth: number, pageHeight: number): number {
  const station = getStation(data);
  let y = startY;
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  y = addSectionTitle(doc, "SELF DECLARATION", y, pageWidth);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);

  const intro = `To,\n${station.chiefEngineer}\n${station.name}\n${station.address}`;
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 4;

  doc.setFont("helvetica", "bold");
  doc.text(`Sub: Declaration regarding RFx: ${data.rfxNumber || "[RFx Number]"}`, margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  const body = `I / We, ${COMPANY.proprietor}, Proprietor of ${COMPANY.name}, having our office at ${COMPANY.address}, GST No. ${COMPANY.gst}, do hereby solemnly declare and affirm that:

1. The information furnished by us in the tender/bid for the above reference is true and correct to the best of our knowledge and belief.

2. We have not been blacklisted / debarred by any Government Department / PSU / Company in India in the last five years.

3. We are not in default of payment of statutory dues like Income Tax, GST, EPF, ESI etc.

4. We have read and understood the terms and conditions of the tender and agree to abide by the same.

5. The prices quoted are firm and shall remain valid for the period mentioned in the tender document.

6. We confirm that the goods/services offered conform to the specifications mentioned in the tender.

7. We are an MSME / eligible entity as per Government of India / State Government guidelines.

8. We declare that we have not paid and shall not pay any bribe or commission to any official of MSPGCL for securing this contract.

9. We understand that MSPGCL reserves the right to cancel / reject our tender without assigning any reason.

10. This declaration is made in good faith and we are aware of the consequences of making a false declaration.`;

  const bodyLines = doc.splitTextToSize(body, contentWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 4.5 + 8;

  doc.setFont("helvetica", "normal");
  doc.text(`Place: Nagpur`, margin, y);
  y += 5;
  doc.text(`Date: ${formatDate(data.date)}`, margin, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("For STERLING ELECTRICALS & TECHNOLOGIES", pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("(Proprietor)", pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.text(COMPANY.proprietor, pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.text(`Vendor Code: ${COMPANY.vendorCode}`, pageWidth - margin, y, { align: "right" });

  return y + 8;
}

// ============================================================
// DOCUMENT 2: DECLARATION / UNDERTAKING (Ministry of Power)
// ============================================================
export function generateDeclarationUndertaking(doc: jsPDF, data: TenderFormData, startY: number, pageWidth: number, pageHeight: number): number {
  const station = getStation(data);
  let y = startY;
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  y = addSectionTitle(doc, "DECLARATION / UNDERTAKING", y, pageWidth);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);

  doc.text(`To,`, margin, y); y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(station.chiefEngineer, margin, y); y += 5;
  doc.text(station.name, margin, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(station.address, margin, y); y += 8;

  doc.setFont("helvetica", "bold");
  const subj = `Sub: Undertaking as per Ministry of Power Order and Public Procurement Policy - RFx: ${data.rfxNumber || "[RFx]"}`;
  const subjLines = doc.splitTextToSize(subj, contentWidth);
  doc.text(subjLines, margin, y);
  y += subjLines.length * 5 + 5;

  doc.setFont("helvetica", "normal");
  const declaration = `I / We, ${COMPANY.proprietor}, Proprietor of ${COMPANY.name}, do hereby declare and undertake as follows:

1. MAKE IN INDIA / LOCAL CONTENT DECLARATION:
   We hereby declare that the goods/services offered by us comply with the "Make in India" policy and the Public Procurement (Preference to Make in India) Order 2017 and its amendments.

2. MINISTRY OF POWER ORDER COMPLIANCE:
   We confirm that we comply with all requirements as per the Ministry of Power circular and directives applicable to suppliers / vendors in the power sector.

3. QUALITY ASSURANCE UNDERTAKING:
   We undertake that all materials/equipment supplied shall conform to relevant IS/IEC standards as specified and shall be of best quality.

4. NO CARTEL / PRICE FIXING:
   We declare that the price quoted is not the result of any agreement, understanding or arrangement with any other bidder or competitor.

5. VENDOR REGISTRATION:
   Our Vendor Code with MSPGCL / MAHAGENCO is ${COMPANY.vendorCode}.

6. GST COMPLIANCE:
   Our GST Registration Number is ${COMPANY.gst} and we are in regular compliance with all GST provisions.

7. BANK DETAILS CONFIRMATION:
   We confirm our bank details: ${COMPANY.bank.name}, A/c No. ${COMPANY.bank.account}, IFSC: ${COMPANY.bank.ifsc}, Branch: ${COMPANY.bank.branch}.

We are aware that any misrepresentation in this undertaking may lead to cancellation of contract and blacklisting.`;

  const declLines = doc.splitTextToSize(declaration, contentWidth);
  doc.text(declLines, margin, y);
  y += declLines.length * 4.5 + 10;

  doc.setFont("helvetica", "bold");
  doc.text("Yours faithfully,", margin, y); y += 8;
  doc.text("For STERLING ELECTRICALS & TECHNOLOGIES", margin, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Proprietor: ${COMPANY.proprietor}`, margin, y); y += 5;
  doc.text(`Date: ${formatDate(data.date)}`, margin, y); y += 5;
  doc.text(`Place: Nagpur`, margin, y);

  return y + 8;
}

// ============================================================
// DOCUMENT 3: ANNEXURE-C (Conflict of Interest)
// ============================================================
export function generateAnnexureC(doc: jsPDF, data: TenderFormData, startY: number, pageWidth: number, pageHeight: number): number {
  const station = getStation(data);
  let y = startY;
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  y = addSectionTitle(doc, "ANNEXURE - C: CONFLICT OF INTEREST UNDERTAKING", y, pageWidth);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(`Tender No.: ${data.tenderNumber || "[Tender Number]"}`, margin, y); y += 5;
  doc.text(`Description: ${data.tenderDescription || "[Description]"}`, margin, y); y += 5;
  doc.text(`RFx No.: ${data.rfxNumber || "[RFx Number]"}`, margin, y); y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);

  const annexureText = `To,
${station.chiefEngineer}
${station.name}
${station.address}

Sub: Declaration regarding Conflict of Interest

I / We, ${COMPANY.proprietor}, Proprietor of ${COMPANY.name}, do hereby declare that:

1. CONFLICT OF INTEREST:
   (a) We do not have any conflict of interest in relation to the above tender.
   (b) None of our employees / associates are related to or employed by MSPGCL / MAHAGENCO or any of its subsidiaries.
   (c) We have not been involved in preparation of the tender specifications or any consultancy work related to this tender.

2. DISCLOSURE OF INTEREST:
   We confirm that we do not have any financial interest (direct or indirect) in any other company that has submitted a bid for this tender.

3. RELATIONSHIP DISCLOSURE:
   We confirm that we do not have any relative employed in MSPGCL / MAHAGENCO / any related Government body who could influence the award of this contract.

4. INDEPENDENT BID:
   Our bid has been prepared independently and without any collusion with other bidders.

5. NO CORRUPT PRACTICES:
   We have not offered, given or promised to give any bribe or illegal gratification to any official of MSPGCL.

We understand that any breach of this declaration will render the contract liable to be cancelled and may result in our firm being blacklisted.`;

  const lines = doc.splitTextToSize(annexureText, contentWidth);
  doc.text(lines, margin, y);
  y += lines.length * 4.5 + 10;

  // Signature block
  doc.setFont("helvetica", "bold");
  doc.text("AUTHORIZED SIGNATORY", margin, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${COMPANY.proprietor}`, margin, y); y += 5;
  doc.text(`Designation: Proprietor`, margin, y); y += 5;
  doc.text(`Company: ${COMPANY.name}`, margin, y); y += 5;
  doc.text(`Date: ${formatDate(data.date)}`, margin, y); y += 5;
  doc.text(`Seal:`, margin, y);

  // Witness block
  doc.setFont("helvetica", "bold");
  doc.text("WITNESSES:", pageWidth - margin - 80, y - 20);
  doc.setFont("helvetica", "normal");
  doc.text(`1. ${COMPANY.witnesses[0]}`, pageWidth - margin - 80, y - 15);
  doc.text(`2. ${COMPANY.witnesses[1]}`, pageWidth - margin - 80, y - 10);

  return y + 8;
}

// ============================================================
// DOCUMENT 4: ITEM DETAILS FORMAT
// ============================================================
export function generateItemDetails(doc: jsPDF, data: TenderFormData, startY: number, pageWidth: number, pageHeight: number): number {
  let y = startY;
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  y = addSectionTitle(doc, "FORMAT FOR ITEM DETAILS / SAP CODES", y, pageWidth);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(`RFx No.: ${data.rfxNumber || "-"}`, margin, y);
  doc.text(`Tender No.: ${data.tenderNumber || "-"}`, pageWidth / 2, y);
  y += 5;
  doc.text(`Description: ${data.tenderDescription || "-"}`, margin, y);
  y += 5;
  doc.text(`Date: ${formatDate(data.date)}`, margin, y);
  doc.text(`Vendor Code: ${COMPANY.vendorCode}`, pageWidth / 2, y);
  y += 8;

  // Table headers
  const cols = [
    { header: "Sr.", width: 8 },
    { header: "SAP Code", width: 30 },
    { header: "Description", width: 50 },
    { header: "HSN", width: 18 },
    { header: "Make/Model", width: 35 },
    { header: "Qty", width: 10 },
    { header: "Unit", width: 12 },
    { header: "Unit Price", width: 22 },
    { header: "Total", width: 22 },
  ];

  // Draw header row
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);

  let xPos = margin + 2;
  cols.forEach((col) => {
    doc.text(col.header, xPos, y + 5);
    xPos += col.width;
  });
  y += 7;

  // Data rows
  let totalAmount = 0;
  data.items.forEach((item, idx) => {
    const rowTotal = item.quantity * item.unitPrice;
    totalAmount += rowTotal;

    // Alternate row bg
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(margin, y, contentWidth, 7, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BLACK);

    xPos = margin + 2;
    const rowData = [
      String(idx + 1),
      item.sapCode || "-",
      item.description || "-",
      item.hsnCode || "-",
      item.makeModel || "-",
      String(item.quantity),
      item.unit || "Nos",
      formatCurrency(item.unitPrice),
      formatCurrency(rowTotal),
    ];

    cols.forEach((col, colIdx) => {
      const text = doc.splitTextToSize(rowData[colIdx], col.width - 2);
      doc.text(text[0] || "", xPos, y + 5);
      xPos += col.width;
    });

    // Row border
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, 7, "S");
    y += 7;
  });

  // Total row
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL", margin + 2, y + 5);
  doc.text(formatCurrency(totalAmount), pageWidth - margin - 22, y + 5);
  y += 10;

  // GST note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("* GST extra as applicable. Prices are exclusive of GST.", margin, y);
  y += 5;
  doc.text(`* Technical Specs: As per tender. Deviation: NIL.`, margin, y);

  return y + 8;
}

// ============================================================
// DOCUMENT 5: DEVIATION SHEET
// ============================================================
export function generateDeviationSheet(doc: jsPDF, data: TenderFormData, startY: number, pageWidth: number, pageHeight: number): number {
  const station = getStation(data);
  let y = startY;
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  y = addSectionTitle(doc, "DEVIATION SHEET", y, pageWidth);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(`RFx No.: ${data.rfxNumber || "-"}    Tender No.: ${data.tenderNumber || "-"}`, margin, y); y += 5;
  doc.text(`Description: ${data.tenderDescription || "-"}`, margin, y); y += 5;
  doc.text(`Station: ${station.name}    Date: ${formatDate(data.date)}`, margin, y); y += 8;

  // Table
  const cols2 = [
    { header: "Sr.", width: 10 },
    { header: "Clause / Specification", width: 70 },
    { header: "Tender Requirement", width: 55 },
    { header: "Our Offer", width: 55 },
    { header: "Deviation", width: 17 },
  ];

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);

  let xPos = margin + 2;
  cols2.forEach((col) => {
    doc.text(col.header, xPos, y + 5);
    xPos += col.width;
  });
  y += 7;

  // NIL deviation row
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(margin, y, contentWidth, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("NIL - NO DEVIATION FROM TENDER SPECIFICATIONS", pageWidth / 2, y + 6, { align: "center" });
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 10, "S");
  y += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  const note = `We hereby confirm that our offer is fully compliant with all the terms, conditions, technical specifications and requirements mentioned in the tender document. There are no deviations whatsoever from the tender specifications. All materials/equipment shall be supplied strictly as per the specifications mentioned in the tender.`;
  const noteLines = doc.splitTextToSize(note, contentWidth);
  doc.text(noteLines, margin, y);
  y += noteLines.length * 5 + 10;

  doc.setFont("helvetica", "bold");
  doc.text("For STERLING ELECTRICALS & TECHNOLOGIES", pageWidth - margin, y, { align: "right" }); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.proprietor} (Proprietor)`, pageWidth - margin, y, { align: "right" }); y += 5;
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth - margin, y, { align: "right" });

  return y + 8;
}

// ============================================================
// DOCUMENT 6: QUESTIONNAIRE
// ============================================================
export function generateQuestionnaire(doc: jsPDF, data: TenderFormData, startY: number, pageWidth: number, pageHeight: number): number {
  let y = startY;
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  y = addSectionTitle(doc, "QUESTIONNAIRE FOR SUPPLY", y, pageWidth);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(`RFx No.: ${data.rfxNumber || "-"}    Tender No.: ${data.tenderNumber || "-"}`, margin, y); y += 5;
  doc.text(`Description: ${data.tenderDescription || "-"}    Date: ${formatDate(data.date)}`, margin, y); y += 8;

  const questions = [
    ["1", "Name and address of the firm", `${COMPANY.name}\n${COMPANY.address}`],
    ["2", "Name of the Proprietor / Partners", COMPANY.proprietor],
    ["3", "GST Registration Number", COMPANY.gst],
    ["4", "PAN Number", "As per records"],
    ["5", "Vendor Code with MSPGCL / MAHAGENCO", COMPANY.vendorCode],
    ["6", "Bank Name & Branch", `${COMPANY.bank.name}, ${COMPANY.bank.branch}`],
    ["7", "Bank Account Number", COMPANY.bank.account],
    ["8", "IFSC Code", COMPANY.bank.ifsc],
    ["9", "Whether items offered are as per tender specifications", "YES - As per tender specifications"],
    ["10", "Delivery period offered", "As per tender requirement"],
    ["11", "Warranty / Guarantee offered", "As per OEM / Manufacturer warranty"],
    ["12", "Country of origin of goods", "INDIA"],
    ["13", "Whether MSME registered", "Yes"],
    ["14", "Any deviation from tender", "NIL - No deviation"],
    ["15", "Contact person and phone number", `${COMPANY.proprietor} - ${COMPANY.contact}`],
    ["16", "Email ID", COMPANY.email],
    ["17", "Website", COMPANY.website],
  ];

  const colWidths = [8, 85, contentWidth - 93];

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text("Sr.", margin + 2, y + 4);
  doc.text("Question", margin + colWidths[0] + 2, y + 4);
  doc.text("Answer", margin + colWidths[0] + colWidths[1] + 2, y + 4);
  y += 6;

  questions.forEach(([sr, q, a], idx) => {
    const rowH = 7;
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(margin, y, contentWidth, rowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    doc.text(sr, margin + 2, y + 5);
    doc.text(doc.splitTextToSize(q, colWidths[1] - 4)[0], margin + colWidths[0] + 2, y + 5);
    doc.text(doc.splitTextToSize(a, colWidths[2] - 4)[0], margin + colWidths[0] + colWidths[1] + 2, y + 5);
    doc.setDrawColor(210, 210, 210);
    doc.rect(margin, y, contentWidth, rowH, "S");
    y += rowH;
  });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("For STERLING ELECTRICALS & TECHNOLOGIES", pageWidth - margin, y, { align: "right" }); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.proprietor} (Proprietor)    Date: ${formatDate(data.date)}`, pageWidth - margin, y, { align: "right" });

  return y + 8;
}

// ============================================================
// MAIN: Generate Combined Tender PDF (6 documents)
// ============================================================
export function generateTenderPDF(data: TenderFormData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottom = pageHeight - 15;

  const generators = [
    { fn: generateSelfDeclaration, name: "SELF DECLARATION" },
    { fn: generateDeclarationUndertaking, name: "DECLARATION/UNDERTAKING" },
    { fn: generateAnnexureC, name: "ANNEXURE-C" },
    { fn: generateItemDetails, name: "ITEM DETAILS" },
    { fn: generateDeviationSheet, name: "DEVIATION SHEET" },
    { fn: generateQuestionnaire, name: "QUESTIONNAIRE" },
  ];

  generators.forEach(({ fn }, index) => {
    if (index > 0) doc.addPage();
    const headerBottom = addHeader(doc, pageWidth);
    addFooter(doc, pageWidth, pageHeight);
    fn(doc, data, headerBottom + 4, pageWidth, pageHeight);
  });

  const tenderRef = data.tenderNumber || data.rfxNumber || "tender";
  doc.save(`Sterling_Tender_${tenderRef}_${data.date || "doc"}.pdf`);
}

// ============================================================
// TAX INVOICE PDF
// ============================================================
export function generateTaxInvoice(data: TenderFormData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  const station = getStation(data);
  addHeader(doc, pageWidth);
  addFooter(doc, pageWidth, pageHeight);

  let y = 32;

  // Title
  doc.setFillColor(...ORANGE);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("TAX INVOICE", pageWidth / 2, y + 6, { align: "center" });
  y += 12;

  // Invoice details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(`Invoice No.: ${data.invoiceNumber || "-"}`, margin, y);
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth / 2, y);
  y += 5;
  doc.text(`PO No.: ${data.poNumber || "-"}`, margin, y);
  doc.text(`PO Date: ${formatDate(data.poDate)}`, pageWidth / 2, y);
  y += 5;
  doc.text(`RFx No.: ${data.rfxNumber || "-"}`, margin, y);
  doc.text(`GST No.: ${COMPANY.gst}`, pageWidth / 2, y);
  y += 8;

  // Bill to
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth / 2 - 2, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("BILL TO:", margin + 2, y + 4);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(station.chiefEngineer, margin, y); y += 4;
  doc.text(station.name, margin, y); y += 4;
  const addrLines = doc.splitTextToSize(station.address, contentWidth / 2 - 4);
  doc.text(addrLines, margin, y);
  y += addrLines.length * 4 + 6;

  // Items table
  const cols = [
    { header: "Sr.", width: 8 },
    { header: "Description", width: 62 },
    { header: "HSN", width: 18 },
    { header: "Qty", width: 10 },
    { header: "Unit", width: 12 },
    { header: "Unit Price", width: 25 },
    { header: "Amount", width: 25 },
  ];

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  let xPos = margin + 2;
  cols.forEach((col) => { doc.text(col.header, xPos, y + 5); xPos += col.width; });
  y += 7;

  let subtotal = 0;
  data.items.forEach((item, idx) => {
    const rowTotal = item.quantity * item.unitPrice;
    subtotal += rowTotal;
    if (idx % 2 === 0) { doc.setFillColor(...LIGHT_GRAY); doc.rect(margin, y, contentWidth, 7, "F"); }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    xPos = margin + 2;
    [String(idx + 1), item.description || "-", item.hsnCode || "-", String(item.quantity), item.unit || "Nos", formatCurrency(item.unitPrice), formatCurrency(rowTotal)].forEach((val, ci) => {
      doc.text(doc.splitTextToSize(val, cols[ci].width - 2)[0], xPos, y + 5);
      xPos += cols[ci].width;
    });
    doc.setDrawColor(210, 210, 210);
    doc.rect(margin, y, contentWidth, 7, "S");
    y += 7;
  });

  // Totals
  const gstRate = 0.18;
  const gst = subtotal * gstRate;
  const total = subtotal + gst;

  const totals = [
    ["Subtotal (excl. GST)", formatCurrency(subtotal)],
    ["CGST @ 9%", formatCurrency(gst / 2)],
    ["SGST @ 9%", formatCurrency(gst / 2)],
    ["TOTAL (incl. GST)", formatCurrency(total)],
  ];

  y += 2;
  totals.forEach(([label, value], idx) => {
    if (idx === totals.length - 1) {
      doc.setFillColor(...NAVY);
      doc.rect(pageWidth / 2, y, contentWidth / 2, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
    }
    doc.text(label + ":", pageWidth / 2 + 2, y + 5);
    doc.text(value, pageWidth - margin - 2, y + 5, { align: "right" });
    y += 7;
  });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("BANK DETAILS FOR PAYMENT:", margin, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);
  doc.text(`Bank: ${COMPANY.bank.name}    Branch: ${COMPANY.bank.branch}`, margin, y); y += 4;
  doc.text(`Account No.: ${COMPANY.bank.account}    IFSC: ${COMPANY.bank.ifsc}`, margin, y); y += 8;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("For STERLING ELECTRICALS & TECHNOLOGIES", pageWidth - margin, y, { align: "right" }); y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);
  doc.text(`${COMPANY.proprietor} (Proprietor)`, pageWidth - margin, y, { align: "right" });

  doc.save(`Sterling_Invoice_${data.invoiceNumber || "inv"}_${data.date || "doc"}.pdf`);
}

// ============================================================
// DELIVERY MEMO PDF
// ============================================================
export function generateDeliveryMemo(data: TenderFormData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  const station = getStation(data);
  addHeader(doc, pageWidth);
  addFooter(doc, pageWidth, pageHeight);

  let y = 32;

  doc.setFillColor(...ORANGE);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("DELIVERY MEMO / CHALLAN", pageWidth / 2, y + 6, { align: "center" });
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(`DM No.: ${data.dmNumber || "-"}`, margin, y);
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth / 2, y);
  y += 5;
  doc.text(`PO No.: ${data.poNumber || "-"}`, margin, y);
  doc.text(`Vehicle No.: ${data.vehicleNumber || "-"}`, pageWidth / 2, y);
  y += 5;
  doc.text(`Reference: ${data.dmReference || data.rfxNumber || "-"}`, margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("DELIVER TO:", margin, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);
  doc.text(station.chiefEngineer, margin, y); y += 4;
  doc.text(station.name, margin, y); y += 4;
  const addrLines2 = doc.splitTextToSize(station.address, contentWidth - 4);
  doc.text(addrLines2, margin, y);
  y += addrLines2.length * 4 + 6;

  // Items
  const cols = [
    { header: "Sr.", width: 10 },
    { header: "SAP Code", width: 28 },
    { header: "Description", width: 70 },
    { header: "Qty", width: 15 },
    { header: "Unit", width: 15 },
    { header: "Remarks", width: contentWidth - 138 },
  ];

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  let xPos = margin + 2;
  cols.forEach((col) => { doc.text(col.header, xPos, y + 5); xPos += col.width; });
  y += 7;

  data.items.forEach((item, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(...LIGHT_GRAY); doc.rect(margin, y, contentWidth, 7, "F"); }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    xPos = margin + 2;
    [String(idx + 1), item.sapCode || "-", item.description || "-", String(item.quantity), item.unit || "Nos", item.remarks || "-"].forEach((val, ci) => {
      doc.text(doc.splitTextToSize(val, cols[ci].width - 2)[0], xPos, y + 5);
      xPos += cols[ci].width;
    });
    doc.setDrawColor(210, 210, 210);
    doc.rect(margin, y, contentWidth, 7, "S");
    y += 7;
  });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text("Received the above goods in good condition.", margin, y); y += 10;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Receiver's Signature & Seal", margin, y);
  doc.text("For STERLING ELECTRICALS & TECHNOLOGIES", pageWidth - margin, y, { align: "right" }); y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);
  doc.text("Name: _____________________", margin, y);
  doc.text(`${COMPANY.proprietor} (Proprietor)`, pageWidth - margin, y, { align: "right" }); y += 4;
  doc.text("Date: _____________________", margin, y);

  doc.save(`Sterling_DM_${data.dmNumber || "dm"}_${data.date || "doc"}.pdf`);
}
