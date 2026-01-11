"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;

async function getPdfjs() {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction is only available in the browser");
  }
  
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }
  
  return pdfjsLib;
}

/**
 * Extract text from a PDF file in the browser
 */
export async function extractTextFromPDFClient(file: File): Promise<string> {
  const pdfLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfLib.getDocument({ data: arrayBuffer }).promise;
  
  const textParts: string[] = [];
  
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str || "")
      .join(" ");
    textParts.push(pageText);
  }
  
  return textParts.join("\n\n");
}
