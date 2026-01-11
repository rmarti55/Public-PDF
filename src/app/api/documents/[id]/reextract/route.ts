import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTextFromPDF } from "@/lib/pdf";

// POST /api/documents/[id]/reextract - Re-extract text from PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get the document to find the PDF file path
    const document = await prisma.document.findUnique({
      where: { id },
      select: { filePath: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    console.log("[Reextract] Fetching PDF from:", document.filePath);

    // Fetch the PDF from Vercel Blob storage
    const pdfResponse = await fetch(document.filePath);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("[Reextract] PDF fetched, extracting text...");

    // Extract text using the updated function (with page markers)
    const extractedText = await extractTextFromPDF(buffer);

    console.log("[Reextract] Text extracted, updating database...");

    // Update the document with the new extracted text
    await prisma.document.update({
      where: { id },
      data: { extractedText },
    });

    console.log("[Reextract] Document updated successfully");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Reextract] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to re-extract text" },
      { status: 500 }
    );
  }
}
