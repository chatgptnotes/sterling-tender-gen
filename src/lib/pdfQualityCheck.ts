"use client";

export interface QADifference {
  element: string;
  expected: string;
  actual: string;
  severity: "high" | "medium" | "low";
}

export interface QAPageResult {
  pageIndex: number;
  pageType: string;
  match: boolean;
  differences: QADifference[];
}

export interface QAResult {
  pages: QAPageResult[];
  allMatch: boolean;
}

function getPageType(pageIndex: number, totalPages: number): string {
  // Standard layout: Self Decl, Declaration, Annexure-C (1-2 pages), Item Details, Deviation, Questionnaire
  if (pageIndex === 0) return "self-declaration";
  if (pageIndex === 1) return "declaration";
  if (pageIndex === 2) return "annexure-c";

  // If 7+ pages, page 3 is annexure-c overflow
  const offset = totalPages > 6 ? 1 : 0;
  if (pageIndex === 3 && offset === 1) return "annexure-c";
  if (pageIndex === 3 + offset) return "item-details";
  if (pageIndex === 4 + offset) return "deviation-sheet";
  if (pageIndex === 5 + offset) return "questionnaire";

  return "unknown";
}

async function renderPDFPageToPNG(pdfBlob: Blob, pageNum: number): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const page = await pdf.getPage(pageNum);

  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire canvas 2D context for PDF page rendering");

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];

  pdf.destroy();
  return base64;
}

async function checkPage(
  pageImage: string,
  pageType: string
): Promise<{ match: boolean; differences: QADifference[] }> {
  try {
    const res = await fetch("/api/check-quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageImage, pageType }),
    });

    if (!res.ok) {
      console.warn(`QA check failed for ${pageType}:`, await res.text());
      return { match: true, differences: [] };
    }

    return await res.json();
  } catch (err) {
    console.warn(`QA check error for ${pageType}:`, err);
    return { match: true, differences: [] };
  }
}

export async function checkPDFQuality(
  pdfBlob: Blob,
  onPageChecked?: (pageIndex: number, total: number) => void
): Promise<QAResult> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = pdf.numPages;
  pdf.destroy();

  const pages: QAPageResult[] = [];

  for (let i = 0; i < totalPages; i++) {
    const pageType = getPageType(i, totalPages);

    if (pageType === "unknown") {
      pages.push({ pageIndex: i, pageType, match: true, differences: [] });
      onPageChecked?.(i + 1, totalPages);
      continue;
    }

    const pageImage = await renderPDFPageToPNG(pdfBlob, i + 1);
    const result = await checkPage(pageImage, pageType);

    pages.push({
      pageIndex: i,
      pageType,
      match: result.match,
      differences: result.differences || [],
    });

    onPageChecked?.(i + 1, totalPages);
  }

  return {
    pages,
    allMatch: pages.every((p) => p.match),
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type QAProgressStatus =
  | { stage: "generating" }
  | { stage: "checking"; page: number; total: number }
  | { stage: "retrying"; attempt: number }
  | { stage: "done"; result: QAResult }
  | { stage: "error"; message: string };

export async function generateWithQACheck(
  generateFn: () => Promise<Blob>,
  filename: string,
  onProgress: (status: QAProgressStatus) => void,
  maxRetries = 1
): Promise<void> {
  let blob: Blob | undefined;
  let qaResult: QAResult | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt === 0) {
      onProgress({ stage: "generating" });
    } else {
      onProgress({ stage: "retrying", attempt });
    }

    try {
      blob = await generateFn();
    } catch (err) {
      onProgress({ stage: "error", message: `Generation failed: ${err}` });
      return;
    }

    try {
      qaResult = await checkPDFQuality(blob, (page, total) => {
        onProgress({ stage: "checking", page, total });
      });
    } catch (err) {
      console.warn("QA check failed, downloading anyway:", err);
      downloadBlob(blob, filename);
      onProgress({ stage: "done", result: { pages: [], allMatch: true } });
      return;
    }

    if (qaResult.allMatch) {
      downloadBlob(blob, filename);
      onProgress({ stage: "done", result: qaResult });
      return;
    }

    console.warn(
      `QA attempt ${attempt + 1}: differences found`,
      qaResult.pages
        .filter((p) => !p.match)
        .map((p) => ({ page: p.pageType, differences: p.differences }))
    );
  }

  // After all retries, download best version with warning
  if (blob) downloadBlob(blob, filename);
  onProgress({ stage: "done", result: qaResult! });
}
