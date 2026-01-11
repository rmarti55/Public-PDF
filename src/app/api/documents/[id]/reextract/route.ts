import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractPagesFromPDF } from "@/lib/pdf";
import { generatePageEmbeddings } from "@/lib/embeddings";

// POST /api/documents/[id]/reextract - Re-extract text from PDF and generate embeddings
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

    console.log("[Reextract] PDF fetched, extracting pages...");

    // Extract pages as array
    const pages = await extractPagesFromPDF(buffer);
    
    // Build full text with page markers for backward compatibility
    const extractedText = pages
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.content}`)
      .join("\n\n");

    console.log("[Reextract] Extracted", pages.length, "pages, generating embeddings...");

    // Generate embeddings for each page
    const pagesWithEmbeddings = await generatePageEmbeddings(pages);

    console.log("[Reextract] Embeddings generated, updating database...");

    // Delete existing page chunks for this document
    await prisma.pageChunk.deleteMany({
      where: { documentId: id },
    });

    // Create new page chunks with embeddings
    await prisma.pageChunk.createMany({
      data: pagesWithEmbeddings.map((p) => ({
        documentId: id,
        pageNumber: p.pageNumber,
        content: p.content,
        embedding: p.embedding,
      })),
    });

    // Update the document with the new extracted text
    await prisma.document.update({
      where: { id },
      data: { extractedText },
    });

    console.log("[Reextract] Document updated successfully with", pages.length, "page chunks");

    return NextResponse.json({ 
      success: true, 
      pagesProcessed: pages.length 
    });
  } catch (error) {
    console.error("[Reextract] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to re-extract text" },
      { status: 500 }
    );
  }
}
