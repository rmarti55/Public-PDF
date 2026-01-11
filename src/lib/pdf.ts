export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require("pdf-parse");
    const pdfParse = pdfParseModule.default || pdfParseModule;
    
    const textParts: string[] = [];
    let pageNum = 0;
    
    await pdfParse(buffer, {
      pagerender: async (pageData: { getTextContent: () => Promise<{ items: { str?: string }[] }> }) => {
        pageNum++;
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items
          .map((item) => item.str || "")
          .join(" ");
        textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
        return pageText;
      }
    });
    
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
