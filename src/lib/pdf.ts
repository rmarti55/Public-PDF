export interface PageContent {
  pageNumber: number;
  content: string;
}

/**
 * Extract text from PDF as an array of page objects
 */
export async function extractPagesFromPDF(buffer: Buffer): Promise<PageContent[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse");
    
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    
    return result.pages.map((page: { text: string; num: number }) => ({
      pageNumber: page.num,
      content: page.text,
    }));
  } catch (error) {
    console.error("Error extracting pages from PDF:", error);
    throw new Error("Failed to extract pages from PDF");
  }
}

/**
 * Extract text from PDF as a single string with page markers (for backward compatibility)
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pages = await extractPagesFromPDF(buffer);
  return pages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.content}`)
    .join("\n\n");
}

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractTextFromPDF(buffer);
}
