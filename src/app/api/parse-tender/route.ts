import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const EXTRACTION_PROMPT = `
You are an expert at reading MSPGCL (Maharashtra State Power Generation Company Limited) tender/RFQ documents.

The user has uploaded one or more tender documents. They may include:
- The main e-tender/RFQ notice
- Bill of Quantities (BOQ)
- Technical specifications
- Annexures

Extract ALL available information across ALL documents provided and return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "rfxNumber": "RFx or e-tender number (e.g. 3000062403)",
  "tenderNumber": "Tender or NIT number",
  "tenderDescription": "Full description of what is being procured",
  "tenderIssueDate": "Date tender was issued in YYYY-MM-DD format",
  "date": "Today or response due date in YYYY-MM-DD format (use tenderIssueDate if unclear)",
  "powerStationCode": "One of: BTPS, KPKD, CSTPS, KTPS, or CUSTOM",
  "customStationName": "Station name if not in the above list",
  "customStationAddress": "Full station address",
  "supplyType": "indigenous or imported",
  "deliveryPeriod": "Delivery period mentioned (e.g. 45 days, As per tender)",
  "makeOffered": "Make/manufacturer if mentioned, else empty string",
  "dealerType": "Manufacturer or Authorized Dealer or Dealer",
  "items": [
    {
      "description": "Full item description",
      "sapCode": "SAP / SETS material code if present, else empty string",
      "hsnCode": "HSN or SAC code if present",
      "makeModel": "Make/model if mentioned",
      "quantity": 1,
      "unit": "Nos/Set/Lot/etc",
      "unitPrice": 0,
      "techSpecs": "Technical specifications if mentioned",
      "remarks": ""
    }
  ]
}

Station mapping rules:
- "Bhusawal" → powerStationCode = "BTPS"
- "Khaperkheda" → powerStationCode = "KPKD"
- "Chandrapur" → powerStationCode = "CSTPS"
- "Koradi" → powerStationCode = "KTPS"
- Any other station → powerStationCode = "CUSTOM", fill customStationName and customStationAddress

If a field is not found in any document, use empty string or 0 for numbers.
Extract ALL line items from the items/material/BOQ table across all documents.
Consolidate information from multiple documents — later documents may have BOQ/item details not in the first.
Return ONLY the JSON, nothing else.
`;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Tender parsing not configured — set GEMINI_API_KEY env var" },
        { status: 503 }
      );
    }

    const formData = await req.formData();

    // Support both single "file" and multiple "files"
    const fileEntries = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    const allFiles = fileEntries.length > 0 ? fileEntries : singleFile ? [singleFile] : [];

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Build Gemini parts — one part per file + final instruction prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    for (const file of allFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = file.name.toLowerCase();
      const fileType = file.type;

      if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
        // PDF sent as inline base64 — Gemini natively reads PDF
        const base64 = buffer.toString("base64");
        parts.push({
          text: `--- Document: ${file.name} ---`,
        });
        parts.push({
          inline_data: { mime_type: "application/pdf", data: base64 },
        });
      } else if (
        fileName.endsWith(".docx") ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        // DOCX → extract text with mammoth
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        const docText = result.value?.trim() || "";
        if (!docText) {
          parts.push({ text: `--- Document: ${file.name} --- [could not extract text]` });
        } else {
          parts.push({ text: `--- Document: ${file.name} ---\n\n${docText}` });
        }
      } else if (fileName.endsWith(".doc")) {
        // Old .doc — try mammoth
        try {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          const docText = result.value?.trim() || "";
          parts.push({ text: `--- Document: ${file.name} ---\n\n${docText || "[binary .doc - limited extraction]"}` });
        } catch {
          parts.push({ text: `--- Document: ${file.name} --- [old .doc format, limited extraction]` });
        }
      } else {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}. Use PDF or DOCX.` },
          { status: 400 }
        );
      }
    }

    // Add the extraction instruction at the end
    parts.push({ text: "\n\n" + EXTRACTION_PROMPT });

    // Call Gemini with all parts in one request
    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return NextResponse.json(
        { error: "AI parsing failed: " + geminiRes.statusText },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON in Gemini response:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "AI did not return valid data. Try again." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    console.error("parse-tender error:", err);
    return NextResponse.json({ error: String(err) || "Internal error" }, { status: 500 });
  }
}
