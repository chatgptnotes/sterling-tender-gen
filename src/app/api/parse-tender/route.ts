import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyB4fmGLVeyFYyFXj7B1V_5kBdo6V7iWh7E";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
  GEMINI_API_KEY;

const EXTRACTION_PROMPT = `
You are an expert at reading MSPGCL (Maharashtra State Power Generation Company Limited) tender/RFQ documents.

Extract ALL available information from this tender document and return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

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
      "sapCode": "SAP material code if present, else empty string",
      "hsnCode": "",
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

If a field is not found in the document, use empty string or 0 for numbers.
Extract ALL line items from the items/material table.
Return ONLY the JSON, nothing else.
`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[] = [];

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      // Send PDF directly to Gemini
      const base64 = buffer.toString("base64");
      parts = [
        { inline_data: { mime_type: "application/pdf", data: base64 } },
        { text: EXTRACTION_PROMPT },
      ];
    } else if (
      fileName.endsWith(".docx") ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Extract text from DOCX using mammoth
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const docText = result.value || "";
      if (!docText.trim()) {
        return NextResponse.json(
          { error: "Could not extract text from document" },
          { status: 400 }
        );
      }
      parts = [
        {
          text:
            "TENDER DOCUMENT TEXT:\n\n" + docText + "\n\n" + EXTRACTION_PROMPT,
        },
      ];
    } else if (fileName.endsWith(".doc")) {
      // Old .doc format — try mammoth anyway
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        const docText = result.value || "";
        parts = [
          {
            text:
              "TENDER DOCUMENT TEXT:\n\n" +
              docText +
              "\n\n" +
              EXTRACTION_PROMPT,
          },
        ];
      } catch {
        return NextResponse.json(
          {
            error:
              "Old .doc format not fully supported. Please save as .docx or PDF.",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload a PDF or DOCX file.",
        },
        { status: 400 }
      );
    }

    // Call Gemini
    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
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
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
    return NextResponse.json(
      { error: String(err) || "Internal error" },
      { status: 500 }
    );
  }
}
