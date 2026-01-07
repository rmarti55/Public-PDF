import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { del } from "@vercel/blob";

// GET single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isAdmin = request.headers.get("x-admin-auth") === "true";

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Non-admin can only see published documents
  if (!isAdmin && !document.published) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Exclude extractedText from response to avoid payload size limits
  const { extractedText: _, ...documentWithoutText } = document;
  return NextResponse.json(documentWithoutText);
}

// PUT update document (admin only)
// Now accepts JSON with optional pre-uploaded blob URL
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      context,
      published,
      fileName,
      filePath,
      extractedText,
    } = body;

    console.log("[PUT /api/documents] Updating document:", id);
    console.log("[PUT /api/documents] Title:", title);
    console.log("[PUT /api/documents] New file:", fileName || "(none)");

    const existingDoc = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      title,
      description: description || null,
      category: category || null,
      context: context || null,
      published: published || false,
    };

    // If a new file was uploaded (client sent new filePath)
    if (filePath && filePath !== existingDoc.filePath) {
      console.log("[PUT /api/documents] New file uploaded, deleting old file...");
      
      // Delete old file from Vercel Blob
      try {
        await del(existingDoc.filePath);
        console.log("[PUT /api/documents] Old file deleted");
      } catch {
        console.log("[PUT /api/documents] Could not delete old file (may not exist)");
      }

      updateData.fileName = fileName || existingDoc.fileName;
      updateData.filePath = filePath;
      
      if (extractedText !== undefined) {
        updateData.extractedText = extractedText;
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    console.log("[PUT /api/documents] Document updated successfully");

    // Exclude extractedText from response
    const { extractedText: _, ...documentWithoutText } = document;
    return NextResponse.json(documentWithoutText);
  } catch (error) {
    console.error("[PUT /api/documents] Error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE document (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete file from Vercel Blob
    try {
      await del(document.filePath);
    } catch {
      // Ignore if file doesn't exist
    }

    // Delete from database
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
