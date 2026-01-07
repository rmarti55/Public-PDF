"use client";

let pdfjs: typeof import("react-pdf").pdfjs | null = null;

async function getPdfjs() {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction is only available in the browser");
  }
  
  if (!pdfjs) {
    const reactPdf = await import("react-pdf");
    pdfjs = reactPdf.pdfjs;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  
  return pdfjs;
}

/**
 * Extract text from a PDF file in the browser
 */
export async function extractTextFromPDFClient(file: File): Promise<string> {
  const pdf = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdf.getDocument({ data: arrayBuffer }).promise;
  
  const textParts: string[] = [];
  
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(pageText);
  }
  
  return textParts.join("\n\n");
}
