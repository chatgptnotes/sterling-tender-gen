"use client";

import jsPDF from "jspdf";
import { COMPANY, POWER_STATIONS, TenderFormData } from "./constants";
import {
  addLetterheadHeader,
  addLetterheadFooter,
  formatDate,
  getStation,
  renderTextWithBoldParts,
} from "./declarationPDF";
// Note: addLetterheadHeader and addLetterheadFooter are used in Annexure C and Self Declaration (Sterling letterhead)

// ─── SELF DECLARATION ────────────────────────────────────────────────────────
export async function addSelfDeclarationToDoc(
  doc: jsPDF,
  data: TenderFormData,
  letterheadDataUrl?: string,
  stampDataUrl?: string
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Sterling letterhead at top
  let y = addLetterheadHeader(doc, letterheadDataUrl || "", pageWidth);

  // Date and Ref — right aligned, below header
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth - margin, y + 2, { align: "right" });
  y += 7;
  const refText = data.reference || `${data.powerStationCode || "BTPS"}/${data.tenderDescription ? data.tenderDescription.split(" ").slice(0, 3).join(" ") : "Tender"}`;
  doc.text(`Ref: ${refText}`, pageWidth - margin, y, { align: "right" });
  y += 12;

  // Title — centered, underlined
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text("SELF DECLARATION", pageWidth / 2, y, { align: "center" });
  const titleW = doc.getTextWidth("SELF DECLARATION");
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - titleW / 2, y + 1.5, pageWidth / 2 + titleW / 2, y + 1.5);
  y += 10;

  // Intro sentence (title-case company name per original DOCX)
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  const introText = `I, ${COMPANY.proprietor} hereby declare that, I am the authorized representative of M/s Sterling Electricals & Technologies`;
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 6 + 5;

  // Clause 1 (title-case company name per original DOCX)
  const clause1 = `1. That we hereby declare that as on present date of filling this form, Date ${formatDate(data.date)}, we have No pending dues with respect to Quarter Rent, another electricity bills or any recovery is pending from MSPGCL to our Firm M/s. Sterling Electricals & Technologies`;
  const c1Lines = doc.splitTextToSize(clause1, contentWidth);
  doc.text(c1Lines, margin, y);
  y += c1Lines.length * 6 + 6;

  // Clause 2 + closing statement (merged into one clause per original DOCX)
  const clause2 = `2. That we shall comply with all health, safety and welfare statutory requirements as envisaged in the provisions of the Factories Act, 1948 and Rules framed there under. We shall be fully responsible for breach of any provisions of the said Act and Rules. We hereby declare that the above information is correct and nothing has been concealed in any manner whatsoever. If undertaking furnished by us is found to be incorrect at any stage, our firm shall be liable for rejection and disqualification from Tender bid.`;
  const c2Lines = doc.splitTextToSize(clause2, contentWidth);
  doc.text(c2Lines, margin, y);
  y += c2Lines.length * 6 + 8;

  // If not enough space for stamp + sig block (need ~55mm), new page
  if (y > pageHeight - 60) {
    doc.addPage();
    addLetterheadFooter(doc, pageWidth, pageHeight);
    y = 25;
  }

  y += 6;

  // Stamp above signature block (right side)
  if (stampDataUrl) {
    doc.addImage(stampDataUrl, "PNG", pageWidth - margin - 32, y - 5, 28, 28);
  }

  // Signature block
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text(`Date: ${formatDate(data.date)}`, margin, y + 5);
  doc.text("Place: Nagpur", margin, y + 12);
  y += 20;

  doc.setFont("times", "bold");
  doc.text("Akhil Bahale", pageWidth - margin, y, { align: "right" });
  y += 7;
  doc.setFont("times", "normal");
  doc.text("For Sterling Electricals & Technologies", pageWidth - margin, y, { align: "right" });

  // Sterling footer
  addLetterheadFooter(doc, pageWidth, pageHeight);
}

// ─── ANNEXURE C ──────────────────────────────────────────────────────────────
export async function addAnnexureCToDoc(
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
  y += 3;

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("ANNEXURE-C", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(10.5);
  doc.text("UNDERTAKING AND COMMITMENT FROM BIDDERS", pageWidth / 2, y, { align: "center" });
  const uw = doc.getTextWidth("UNDERTAKING AND COMMITMENT FROM BIDDERS");
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - uw / 2, y + 0.5, pageWidth / 2 + uw / 2, y + 0.5);
  y += 7;

  // Date
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth - margin, y, { align: "right" });
  y += 6;

  // To block
  doc.text("To,", margin, y); y += 5;
  doc.setFont("times", "bold");
  doc.text(station.chiefEngineer, margin, y); y += 5;
  doc.setFont("times", "normal");
  doc.text(station.name, margin, y); y += 5;
  const addrLines = doc.splitTextToSize(station.address, contentWidth * 0.6);
  addrLines.forEach((l: string) => { doc.text(l, margin, y); y += 5; });
  y += 2;

  doc.setFont("times", "bold");
  doc.text("Dear Sir,", margin, y); y += 6;

  // Opening
  doc.setFont("times", "normal");
  const tenderDate = data.tenderIssueDate ? formatDate(data.tenderIssueDate) : formatDate(data.date);
  const opening = `In accordance with your Tender for RFx No: ${data.rfxNumber || "[RFx]"} ${data.tenderDescription || "[Description]"} Under your Tender No ${data.tenderNumber || "[Tender No]"} dated ${tenderDate} M/s. ${COMPANY.name}, ${COMPANY.address} (Hereinafter called the Tenderer) hereby submit the undertaking as under:`;
  const openLineCount = renderTextWithBoldParts(
    doc, opening,
    [data.rfxNumber, data.tenderNumber].filter(Boolean),
    margin, y, contentWidth, 5
  );
  y += openLineCount * 5 + 4;

  // Point i
  const p1 = `i.\tThe Tenderer commits to undertake all measures necessary to prevent conflict of interest with other bidders which may lead to anti-competitive practices to the detriment of Purchaser interests.`;
  const p1Lines = doc.splitTextToSize(p1, contentWidth);
  doc.text(p1Lines, margin, y);
  y += p1Lines.length * 5 + 3;

  // Point ii
  doc.text("ii.\tThe Tenderer has read and understood the following terms and conditions of the Purchaser.", margin, y);
  y += 10;

  doc.setFont("times", "bold");
  doc.text("Terms and Conditions that are binding on bidder for the duration of course of Tender:", margin, y);
  y += 7;

  doc.setFont("times", "normal");
  doc.text("i.\tA bidder may be considered to have a conflict of interest with one or more parties in this bidding process, if:", margin, y);
  y += 6;

  const subPoints = [
    "a)  They have controlling partner(s) in common; or",
    "b)  They receive or have received any direct or indirect subsidy/financial stake from any of them; or",
    "c)  They have the same legal representative/agent for purpose of this bid; or",
    "d)  They have relationship with each other, directly or through common third parties, that puts them in a position to have access to information about or influence on the bid of another bidder; or",
    "e)  Bidder participates in more than one bid in this bidding process. Participation by a bidder in more than one Bid will result in the disqualification of all bids in which the parties are involved.",
    "f)   In cases of Authorized Dealer/Channel Partner, quoting on behalf of their principal manufacturers, one agent cannot represent two manufacturers or quote on their behalf in a particular tender enquiry.",
    "g) A Bidder or any of its affiliates participated as a consultant in the preparation of the design or technical specification of the contract that is the subject of the Bid;",
    "h) In case of a holding company having more than one independently manufacturing units, only one unit should quote. Similar restrictions would apply to closely related sister companies.",
    "i)   If bidding firm or their personnel have relationship or financial or business transactions with any official of procuring entity who are directly or indirectly related to the tender or execution of contract.",
    "j)  If improper use of information obtained by prospective bidder from the procuring entity with an intent to gain unfair advantage in procurement process or for personal gain.",
  ];

  subPoints.forEach((pt) => {
    const lines = doc.splitTextToSize(pt, contentWidth - 6);
    doc.text(lines, margin + 4, y);
    y += lines.length * 4.8 + 1.5;
  });

  y += 2;
  const remainingPoints = [
    "ii.\tFor the purposes of this clause, Term 'control' as applied to any person, means the possession, directly or indirectly, of the power to direct or cause the direction of the management or policies of that person whether through ownership of voting securities, by contract, or otherwise.",
    "iii.\tThe bidder found to have a conflict of interest shall be disqualified.",
    "iv.\tIf the Purchaser/Procurer has disqualified bidder from the bidding process or has terminated contract on these grounds, the Purchaser/Procurer shall forfeit EMD, encash security deposit and contract performance deposit in addition to excluding bidder from future award process and terminating the contract.",
    "v.\tThis undertaking shall form a part of the contract.",
  ];

  remainingPoints.forEach((pt) => {
    const lines = doc.splitTextToSize(pt, contentWidth);
    // Page overflow mid-content
    lines.forEach((line: string) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        addLetterheadFooter(doc, pageWidth, pageHeight);
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 2;
  });

  y += 5;

  // If not enough space for stamp + full sig block (need ~75mm), new page
  if (y > pageHeight - 80) {
    doc.addPage();
    addLetterheadFooter(doc, pageWidth, pageHeight);
    y = 25;
  }

  // Stamp
  if (stampDataUrl) {
    doc.addImage(stampDataUrl, "PNG", pageWidth - margin - 30, y - 4, 26, 26);
  }

  // Signature block
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.text(`Date: ${formatDate(data.date)}`, margin, y + 18);
  doc.setFont("times", "bold");
  doc.text("(Printed Name) AKHIL BAHALE", pageWidth - margin, y + 18, { align: "right" });
  y += 22;
  doc.setFont("times", "normal");
  doc.text("Place: Nagpur", margin, y);
  doc.text("(Designation) Proprietor", pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.text("Signature- ____________________", pageWidth - margin, y, { align: "right" });
  y += 12;

  // Witnesses
  doc.setFont("times", "bold");
  doc.text("In presence of:", margin, y); y += 5;
  doc.setFont("times", "normal");
  doc.text("WITNESS (with full name, designation, address & official seal, if any)", margin, y); y += 7;
  doc.text(`(1) ${COMPANY.witnesses[0]}`, margin, y);
  if (sig1DataUrl) doc.addImage(sig1DataUrl, "PNG", margin + 110, y - 6, 28, 9);
  y += 10;
  doc.text(`(2) ${COMPANY.witnesses[1]}`, margin, y);
  if (sig2DataUrl) doc.addImage(sig2DataUrl, "PNG", margin + 110, y - 6, 28, 9);
  y += 10;

  doc.setFont("times", "italic");
  doc.setFontSize(8.5);
  doc.text("Please indicate the name and address of the projects / station / offices where the undertaking is to be executed.", margin, y);
}

// ─── DEVIATION SHEET ─────────────────────────────────────────────────────────
export async function addDeviationSheetToDoc(
  doc: jsPDF,
  data: TenderFormData,
  stampDataUrl?: string
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Plain page — MSPGCL format (no Sterling letterhead)
  let y = 18;

  // MSPGCL header — bold centered
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("MAHARASHTRA STATE POWER GENERATION COMPANY LIMITED", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Title
  doc.setFontSize(13);
  doc.text("DEVIATIONS (IF ANY)", pageWidth / 2, y, { align: "center" });
  const dw = doc.getTextWidth("DEVIATIONS (IF ANY)");
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - dw / 2, y + 1, pageWidth / 2 + dw / 2, y + 1);
  y += 8;

  // Tender info
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  const descLines = doc.splitTextToSize(data.tenderDescription || "[Tender Description]", contentWidth);
  doc.text(descLines, margin, y);
  y += descLines.length * 5 + 3;
  // Tender for : RFx bold (label has space before colon per original DOC)
  doc.setFont("times", "normal");
  doc.text("Tender for : ", margin, y);
  doc.setFont("times", "bold");
  doc.text(data.rfxNumber || "[RFx Number]", margin + doc.getTextWidth("Tender for : "), y);
  doc.setFont("times", "normal");
  y += 5;
  // Tender No- bold (dash per original DOC)
  doc.text("Tender No- ", margin, y);
  doc.setFont("times", "bold");
  doc.text(data.tenderNumber || "[Tender Number]", margin + doc.getTextWidth("Tender No- "), y);
  doc.setFont("times", "normal");
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth - margin, y, { align: "right" });
  y += 8;

  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (data.deviationStatus === "nil") {
    // NIL DEVIATION box
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("NIL/NO DEVIATION", pageWidth / 2, y + 12, { align: "center" });
    doc.setLineWidth(0.8);
    doc.rect(margin + 20, y, contentWidth - 40, 22);
    y += 30;
    doc.setFont("times", "normal");
    doc.setFontSize(10.5);
    const nilText = "We hereby confirm that our offer is fully compliant with all the terms, conditions, technical specifications and requirements mentioned in the tender document. There are no deviations whatsoever from the tender specifications.";
    const nilLines = doc.splitTextToSize(nilText, contentWidth);
    doc.text(nilLines, margin, y);
    y += nilLines.length * 5 + 5;
  } else {
    // DEVIATION TABLE
    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    doc.text("DEVIATIONS FROM TENDER SPECIFICATIONS:", margin, y);
    y += 6;

    const colWidths = [10, 55, 60, 60];
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 7, "S");
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    let xp = margin + 2;
    ["Sr.", "Clause / Specification", "Tender Requirement", "Our Offer / Deviation"].forEach((h, i) => {
      doc.text(h, xp, y + 5);
      xp += colWidths[i];
    });
    y += 7;

    const devLines = data.deviationText
      ? data.deviationText.split("\n").filter((l) => l.trim())
      : ["[Enter deviation details]"];

    devLines.forEach((line, idx) => {
      doc.setFont("times", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(String(idx + 1), margin + 2, y + 7);
      const wrapped = doc.splitTextToSize(line, colWidths[3] - 4);
      doc.text(wrapped[0] || "", margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 7);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, contentWidth, 10, "S");
      y += 10;
    });
    y += 5;
  }

  y += 5;

  // Overflow check before signature block
  const pageHeightDS = doc.internal.pageSize.getHeight();
  if (y > pageHeightDS - 55) {
    doc.addPage();
    y = 20;
  }

  y += 3;
  // Stamp above signature block
  if (stampDataUrl) {
    doc.addImage(stampDataUrl, "PNG", pageWidth - margin - 32, y - 5, 28, 28);
  }

  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text("NAME: Akhil Bahale", margin, y + 8);
  y += 13;
  doc.setFont("times", "normal");
  doc.text("DESIGNATION: Proprietor", margin, y);
  y += 5;
  doc.setFont("times", "normal");
  doc.text("Tender No- ", margin, y);
  doc.setFont("times", "bold");
  doc.text(data.tenderNumber || "-", margin + doc.getTextWidth("Tender No- "), y);
  doc.setFont("times", "normal");
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth - margin, y, { align: "right" });
}

// ─── QUESTIONNAIRE FOR SUPPLY ─────────────────────────────────────────────────
export async function addQuestionnaireToDoc(
  doc: jsPDF,
  data: TenderFormData,
  stampDataUrl?: string
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Plain page — MSPGCL format (no Sterling letterhead)
  let y = 18;

  // MSPGCL header
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("MAHARASHTRA STATE POWER GENERATION COMPANY LIMITED", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const sub = `Sub:  ${data.tenderDescription || "[Tender Description]"}`;
  const subLines = doc.splitTextToSize(sub, contentWidth);
  doc.text(subLines, margin, y);
  y += subLines.length * 5 + 2;
  doc.text("Ref.: E-Tender. ", margin, y);
  doc.setFont("times", "bold");
  doc.text(data.rfxNumber || "[RFx]", margin + doc.getTextWidth("Ref.: E-Tender. "), y);
  doc.setFont("times", "normal");
  y += 5;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Table
  const col1 = 10, col2 = 80, col3 = contentWidth - 90;
  const headerH = 8;

  // Table header — plain borders, no colored fill (per original DOC)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, headerH, "S");
  doc.line(margin + col1, y, margin + col1, y + headerH);
  doc.line(margin + col1 + col2, y, margin + col1 + col2, y + headerH);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Sr.", margin + 2, y + 6);
  doc.text("PARTICULARS", margin + col1 + 2, y + 6);
  doc.text("Information / Comments to be  filled by the Supplier", margin + col1 + col2 + 2, y + 6);
  y += headerH;

  // "Please strike off whichever is not applicable" note row (per original DOC)
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("Please strike off whichever is not applicable", margin + col1 + col2 + 2, y + 5);
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, contentWidth, 7, "S");
  doc.line(margin + col1, y, margin + col1, y + 7);
  doc.line(margin + col1 + col2, y, margin + col1 + col2, y + 7);
  y += 7;

  const rows: [string, string, string][] = [
    [
      "1",
      "Terms of Payment :  100% payment will be made within a period of 45 days after the receipt of material at site in good condition against GRN issued by consignee & submission of bills in triplicate to AGM (F & A)",
      "Acceptable",
    ],
    ["2", "Validity   ( To be counted from the date of opening of Techno commercial bid )\n60 days", "Acceptable"],
    ["3", "Acceptance for Scope of Supply and Special Terms and Conditions", "Acceptable"],
    ["4", "Delivery Period :-.", data.deliveryPeriod || "As per tender"],
    ["5", "Manufacturer / Dealer ( Pls Specify)", data.dealerType || "Authorized Dealer"],
    ["6", "Make Offered", data.makeOffered || (data.items[0]?.makeModel || "As per tender")],
    [
      "7",
      "In case of Authorized Dealer, who will submit performance B.G. for the materials equal to 10% value of the order as per Annexure-A of QR.",
      data.dealerType === "Authorized Dealer" ? "Authorized Dealer" : "Not Applicable",
    ],
    [
      "8",
      "In case of Authorized Dealer, if the authorized dealer / channel partner fails to execute the order then the manufacturer along with authorized dealer / channel partner would be liable for black listing.",
      "Acceptable",
    ],
    [
      "9",
      "The proposed quantity in this tender is approximate & may vary as per actual requirement at the time of placement of PO.",
      "Acceptable",
    ],
  ];

  rows.forEach(([sr, particulars, answer], idx) => {
    const pLines = doc.splitTextToSize(particulars, col2 - 4);
    const aLines = doc.splitTextToSize(answer, col3 - 4);
    const rowH = Math.max(pLines.length, aLines.length) * 5 + 4;

    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(sr, margin + 2, y + 6);
    doc.text(pLines, margin + col1 + 2, y + 5);
    doc.text(aLines, margin + col1 + col2 + 2, y + 5);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, rowH, "S");
    // column dividers
    doc.line(margin + col1, y, margin + col1, y + rowH);
    doc.line(margin + col1 + col2, y, margin + col1 + col2, y + rowH);
    y += rowH;
  });

  y += 8;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  const undertakeLines = doc.splitTextToSize("I / We hereby undertake to certify that the information and supporting documents submitted along with tender are true and authentic. Any information / document if found false, I/We are liable for action deemed fit by MSPGCL", contentWidth);
  doc.text(undertakeLines, margin, y);
  y += undertakeLines.length * 5 + 5;

  // Overflow check before signature block
  const pageHeightQ = doc.internal.pageSize.getHeight();
  if (y > pageHeightQ - 55) {
    doc.addPage();
    y = 20;
  }

  // Stamp placed above/beside signature block
  if (stampDataUrl) {
    doc.addImage(stampDataUrl, "PNG", pageWidth - margin - 32, y - 5, 28, 28);
  }

  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text("SEAL, SIGN & FULL NAME OF BIDDER", margin, y + 8);
  y += 14;
  doc.setFont("times", "normal");
  doc.text(COMPANY.proprietor, margin, y);
}

// ─── ITEM DETAILS FORMAT ─────────────────────────────────────────────────────
// Matches the original DOCX: Title → Table → Tender info → Stamp → Signature
// No MSPGCL header (per original document).
export async function addItemDetailsToDoc(
  doc: jsPDF,
  data: TenderFormData,
  stampDataUrl?: string
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let y = 18;

  // Title — bold centered (no MSPGCL header per original DOCX)
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("FORMAT FOR ITEM DETAILS", pageWidth / 2, y, { align: "center" });
  const tw = doc.getTextWidth("FORMAT FOR ITEM DETAILS");
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - tw / 2, y + 1, pageWidth / 2 + tw / 2, y + 1);
  y += 8;

  // Column widths proportional to original DOCX (twips: 697, 2088, 3482, 2948, 2911, 1799 = 13925 total)
  // Scaled to 180mm content width: 9+27+45+38+38+23 = 180
  const cols = [
    { header: "SR. NO.", width: 9 },
    { header: "ITEM CODE\n(SETS Code)", width: 27 },
    { header: "HSN /SAC CODE\n(As per GST Act\nNotified by GOI)", width: 45 },
    { header: "MAKE  & MODEL\nOFFERRED BY\nBIDDER *", width: 38 },
    { header: "TECHNICAL\nSPECIFICATIONS\nOFFERED BY\nBIDDERS*", width: 38 },
    { header: "REMARKS\n(IF ANY)", width: 23 },
  ];

  // Header row — plain table with borders, no colored fill (per original DOCX)
  const headerH = 16;
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  let xp = margin;
  cols.forEach((col) => {
    const lines = col.header.split("\n");
    const lineH = 4;
    const totalH = lines.length * lineH;
    const startY = y + (headerH - totalH) / 2 + lineH - 1;
    lines.forEach((line, li) => {
      doc.text(line, xp + col.width / 2, startY + li * lineH, { align: "center" });
    });
    xp += col.width;
  });
  // Header border and column dividers
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, headerH, "S");
  xp = margin;
  cols.forEach((col, i) => {
    xp += col.width;
    if (i < cols.length - 1) {
      doc.line(xp, y, xp, y + headerH);
    }
  });
  y += headerH;

  // Data rows
  data.items.forEach((item, idx) => {
    const rowLines = Math.max(
      doc.splitTextToSize(item.sapCode || "-", cols[1].width - 2).length,
      doc.splitTextToSize(item.hsnCode || "-", cols[2].width - 2).length,
      doc.splitTextToSize(item.makeModel || data.makeOffered || "-", cols[3].width - 2).length,
      doc.splitTextToSize(item.techSpecs || "AS PER TENDER", cols[4].width - 2).length,
      1
    );
    const rowH = Math.max(rowLines * 5 + 4, 12);

    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    const cellData = [
      `${idx + 1})`,
      item.sapCode || "-",
      item.hsnCode || "-",
      item.makeModel || (data.makeOffered || "-"),
      item.techSpecs || "AS PER TENDER",
      item.remarks || "NO",
    ];

    xp = margin;
    cols.forEach((col, ci) => {
      const wrapped = doc.splitTextToSize(cellData[ci], col.width - 3);
      doc.text(wrapped, xp + 2, y + 6);
      xp += col.width;
    });

    // Row border + column dividers — black borders (per original DOCX)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, rowH, "S");
    xp = margin;
    cols.forEach((col, i) => {
      xp += col.width;
      if (i < cols.length - 1) {
        doc.line(xp, y, xp, y + rowH);
      }
    });
    y += rowH;
  });

  y += 8;

  // Tender info — AFTER the table (per original DOCX), all bold
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  const descText = `Tender:  Description of Tender: ${data.tenderDescription || "[Tender Description]"}`;
  const descLines = doc.splitTextToSize(descText, contentWidth);
  doc.text(descLines, margin, y);
  y += descLines.length * 5 + 2;
  // Ref line with RFx number bold (entire line is bold per DOCX)
  doc.text("Ref.: E-Tender. Rfx No  ", margin, y);
  doc.text(data.rfxNumber || "[RFx]", margin + doc.getTextWidth("Ref.: E-Tender. Rfx No  "), y);
  y += 8;

  // Overflow check before signature
  const pageHeightID = doc.internal.pageSize.getHeight();
  if (y > pageHeightID - 50) {
    doc.addPage();
    y = 20;
  }

  // Stamp
  if (stampDataUrl) {
    doc.addImage(stampDataUrl, "PNG", pageWidth - margin - 32, y - 5, 28, 28);
  }

  // Signature block (per original DOCX)
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text("        NAME: AKHIL BAHALE", margin, y + 10);
  y += 15;
  doc.text(" DESIGNATION: PROPRIETOR", margin, y);
}
