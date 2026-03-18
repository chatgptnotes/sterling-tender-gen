import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
  GEMINI_API_KEY;

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "self-declaration": `Self Declaration page with Sterling letterhead:
    - Full-page letterhead background (logo top-left, red company name, blue/gray divider, footer at bottom)
    - Title "SELF DECLARATION" centered, bold, underlined
    - Date and Ref right-aligned below header
    - Intro text with company name in title case "Sterling Electricals & Technologies"
    - Clause 1 and Clause 2 (merged with closing statement)
    - Signature block with stamp, "Akhil Bahale" (mixed case), "For Sterling Electricals & Technologies"
    - All text in Times New Roman font`,

  declaration: `Declaration/Undertaking page with Sterling letterhead:
    - Full-page letterhead background
    - Title "UNDERTAKING TO BE SUBMITTED WITH TENDER" centered, bold, underlined
    - Date, To block, Dear Sir
    - Opening paragraph with tender details
    - General statement paragraph
    - Imported supply paragraph (with strikethrough if not applicable)
    - "OR" centered bold
    - Indigenous supply paragraph (with strikethrough if not applicable)
    - Non-compliance warning paragraph
    - Signature block with stamp, witnesses`,

  "annexure-c": `Annexure-C page with Sterling letterhead:
    - Full-page letterhead background
    - Title "ANNEXURE-C" and "UNDERTAKING AND COMMITMENT FROM BIDDERS"
    - To block, opening paragraph with RFx and tender numbers bold
    - 10 conflict-of-interest sub-points (a through j)
    - Remaining points (ii through v)
    - Signature block with stamp, witnesses`,

  "item-details": `Item Details page (no letterhead, no MSPGCL header):
    - Title "FORMAT FOR ITEM DETAILS" centered, bold, underlined
    - 6-column table: SR.NO., ITEM CODE (SETS), HSN/SAC CODE, MAKE & MODEL OFFERRED, TECHNICAL SPECS, REMARKS
    - "OFFERRED" has double F
    - Plain black borders, no colored fills
    - Tender info AFTER table: "Tender:  Description of Tender:" and "Ref.: E-Tender. Rfx No  "
    - All text Times New Roman`,

  "deviation-sheet": `Deviation Sheet (MSPGCL format, no letterhead):
    - "MAHARASHTRA STATE POWER GENERATION COMPANY LIMITED" in dark red (139,0,0), bold centered
    - NO double lines below header
    - "DEVIATIONS (IF ANY)" in green (0,128,0), bold centered, NO underline
    - Tender info labels: "Tender for : " (space before colon), "Tender No- " (dash not colon)
    - If NIL: "NIL/NO DEVIATION" in red (255,0,0), full-width bordered box
    - NO separator line before NIL box
    - Signature: "NAME: Akhil Bahale", "DESIGNATION: Proprietor"`,

  questionnaire: `Questionnaire page (MSPGCL format, no letterhead):
    - "MAHARASHTRA STATE POWER GENERATION COMPANY LIMITED" in dark red (139,0,0), bold italic
    - NO double lines below header
    - "Sub:  " and "Ref.: E-Tender. " in dark blue (0,0,128), bold italic
    - NO separator line between Ref and table
    - 9-row table, plain borders, no colored fills
    - Row 2 answer: "60 days" (not "Acceptable")
    - "SEAL, SIGN & FULL NAME OF BIDDER" at end`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageImage, pageType } = body;

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "QA service not configured — set GEMINI_API_KEY env var" },
        { status: 503 }
      );
    }

    if (!pageImage || !pageType) {
      return NextResponse.json(
        { error: "Missing pageImage or pageType" },
        { status: 400 }
      );
    }

    const description = PAGE_DESCRIPTIONS[pageType];
    if (!description) {
      return NextResponse.json(
        { error: `Unknown page type: ${pageType}` },
        { status: 400 }
      );
    }

    const prompt = `You are a document formatting quality checker. Compare the GENERATED page image against the REFERENCE format description.

REFERENCE FORMAT:
${description}

Check these aspects:
1. Text colors (exact RGB match)
2. Font styles (bold, italic, normal)
3. Text content (word-for-word match)
4. Layout (margins, spacing, alignment)
5. Lines/borders (presence, thickness, color)
6. Images (logo, stamp, signatures - position and presence)

Return ONLY a JSON object:
{
  "match": true/false,
  "differences": [
    { "element": "description of element", "expected": "what it should be", "actual": "what it appears to be", "severity": "high/medium/low" }
  ]
}

If the page matches the reference format closely (minor rendering differences are acceptable), set match to true with an empty differences array.`;

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "image/png", data: pageImage } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini QA error:", err);
      return NextResponse.json({ error: "QA check failed" }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        match: true,
        differences: [],
        warning: "Could not parse QA response",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("check-quality error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
