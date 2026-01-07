import type { TextItem } from "pdfjs-dist/types/src/display/api";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid issues with Next.js bundling
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Convert Buffer to Uint8Array as required by pdfjs-dist
    const uint8Array = new Uint8Array(buffer);
    
    // Load the PDF document with verbosity disabled
    const loadingTask = pdfjsLib.getDocument({ 
      data: uint8Array,
      verbosity: 0, // Suppress warnings
    });
    const pdf = await loadingTask.promise;
    
    // Extract text from all pages
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .map((item) => item.str)
        .join(" ");
      textParts.push(pageText);
    }
    
    return textParts.join("\n\n");
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractTextFromPDF(buffer);
}
