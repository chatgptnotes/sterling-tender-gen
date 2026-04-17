# Sterling Tender Doc Generator

## Critical Rules

### Document Format Retention (MANDATORY)
When generating PDF documents, the formatting of original reference documents (DOCX/DOC) MUST be retained EXACTLY:

1. **Colors**: Every text color from the original document must be preserved. Do NOT default to black if the original has colored text (e.g., MSPGCL header = dark red, DEVIATIONS title = green, NIL/NO DEVIATION = red).

2. **Fonts**: Use Times New Roman ("times") for all document content. Do NOT switch to helvetica or other fonts.

3. **Text Exact Match**: Non-variable text (labels, headings, fixed paragraphs) must match the original document word-for-word, including:
   - Spacing (single vs double spaces)
   - Punctuation ("Tender for : " with space before colon, "Tender No- " with dash)
   - Case ("Akhil Bahale" not "AKHIL BAHALE" unless original is caps)

4. **No Added Colors**: Do NOT add background fills, colored headers, or alternating row colors to tables unless the original document has them. Tables should have plain black borders only.

5. **Letterhead**: Uses programmatic rendering matching `Sterling Letter head.pdf`:
   - Header: Logo top-left + "STERLING ELECTRICALS & TECHNOLOGIES" in red + blue/gray divider
   - Footer: 3 lines (Address, Email/Website/Contact, GST) left-aligned at page bottom
   - Only pages 1 (Self Declaration), 2 (Declaration/Undertaking), 3-4 (Annexure-C) get letterhead
   - Pages without letterhead: Item Details, Deviation Sheet, Questionnaire
   - Overflow/continuation pages are PLAIN (no header, no footer)

6. **Page Overflow**: When content doesn't fit on one page, continuation pages must be PLAIN (no letterhead header or footer). Only the first page of each letterhead document gets the header/footer.

### Document-Specific Formats

#### Deviation Sheet (MSPGCL format, no letterhead)
- "MAHARASHTRA STATE POWER GENERATION COMPANY LIMITED" — dark red (139,0,0)
- "DEVIATIONS (IF ANY)" — green (0,128,0) with underline
- "NIL/NO DEVIATION" — red (255,0,0) in bordered box
- Labels: "Tender for : " (space before colon), "Tender No- " (dash not colon)
- Signature: "NAME: Akhil Bahale" (mixed case), "DESIGNATION: Proprietor"

#### Questionnaire (MSPGCL format, no letterhead)
- "Sub:  " (double space after colon)
- "Ref.: E-Tender. " (no "No" word)
- Table: plain borders, no colored fills
- "Please strike off whichever is not applicable" note row
- "Terms of Payment :  100%..." (space before colon, double space)
- "against GRN issued" (not "RR Nos")
- "Delivery Period :-."
- "SEAL, SIGN & FULL NAME OF BIDDER" (no colon at end)

#### Item Details (no MSPGCL header, no letterhead)
- Title "FORMAT FOR ITEM DETAILS" then table immediately
- Tender info AFTER the table (not before)
- "MAKE  & MODEL OFFERRED BY BIDDER *" (double space, double F in OFFERRED)
- "Tender:  Description of Tender:" (double space, bold)
- "Ref.: E-Tender. Rfx No  " (double space, bold)
- Table: plain borders, no colored fills

#### Self Declaration (Sterling letterhead)
- Company name in title case: "Sterling Electricals & Technologies" (not ALL CAPS)
- Clause 2 includes closing statement (merged, not separate paragraph)

#### Declaration/Undertaking (Sterling letterhead)
- Both imported AND indigenous options always present
- Non-applicable option has strikethrough lines
- "OR" centered bold between options
- Tender number and RFx number bold inline in paragraphs

#### Annexure-C (Sterling letterhead)
- RFx and Tender numbers bold inline in opening paragraph

## Karpathy Coding Guidelines

> Source: https://github.com/forrestchang/andrej-karpathy-skills
> Derived from Andrej Karpathy's observations on LLM coding pitfalls.

### 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that was not requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
- Do not improve adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match existing style, even if you would do it differently.
- Only remove imports/variables/functions that YOUR changes made unused.
- Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
- Transform tasks into verifiable goals before starting.
- For multi-step tasks, state a brief plan with a verify step for each.
- Define success criteria concretely — weak criteria require constant clarification.

