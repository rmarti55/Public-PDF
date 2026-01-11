import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { del } from "@vercel/blob";
import { Prisma } from "@prisma/client";

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
      thumbnailUrl,
    } = body;

    // Log full request body for debugging (excluding large fields)
    console.log("[PUT /api/documents] Request received:", {
      documentId: id,
      title,
      description: description ? `${description.slice(0, 100)}...` : "(none)",
      category: category || "(none)",
      context: context ? `${context.slice(0, 100)}...` : "(none)",
      published,
      fileName: fileName || "(none)",
      filePath: filePath || "(none)",
      thumbnailUrl: thumbnailUrl || "(none)",
      hasExtractedText: !!extractedText,
      extractedTextLength: extractedText?.length || 0,
    });

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

      // Delete old thumbnail if it exists
      if (existingDoc.thumbnailUrl) {
        try {
          await del(existingDoc.thumbnailUrl);
          console.log("[PUT /api/documents] Old thumbnail deleted");
        } catch {
          console.log("[PUT /api/documents] Could not delete old thumbnail (may not exist)");
        }
      }

      updateData.fileName = fileName || existingDoc.fileName;
      updateData.filePath = filePath;
      
      if (extractedText !== undefined) {
        updateData.extractedText = extractedText;
      }
      
      if (thumbnailUrl !== undefined) {
        updateData.thumbnailUrl = thumbnailUrl;
      }
    }

    // Allow updating thumbnail separately (for regeneration)
    if (thumbnailUrl && !filePath) {
      // Delete old thumbnail if it exists
      if (existingDoc.thumbnailUrl) {
        try {
          await del(existingDoc.thumbnailUrl);
          console.log("[PUT /api/documents] Old thumbnail deleted for regeneration");
        } catch {
          console.log("[PUT /api/documents] Could not delete old thumbnail");
        }
      }
      updateData.thumbnailUrl = thumbnailUrl;
    }

    // Log the update data being sent to Prisma
    console.log("[PUT /api/documents] Update data:", {
      ...updateData,
      context: updateData.context ? `${String(updateData.context).slice(0, 100)}...` : null,
      extractedText: updateData.extractedText ? `[${String(updateData.extractedText).length} chars]` : undefined,
    });

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    console.log("[PUT /api/documents] Document updated successfully, id:", document.id);

    // Exclude extractedText from response
    const { extractedText: _, ...documentWithoutText } = document;
    return NextResponse.json(documentWithoutText);
  } catch (error) {
    // Enhanced error logging for production debugging
    console.error("[PUT /api/documents] Error updating document:", id);
    console.error("[PUT /api/documents] Error type:", error?.constructor?.name);
    console.error("[PUT /api/documents] Error message:", error instanceof Error ? error.message : String(error));
    
    // Detailed Prisma error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[PUT /api/documents] Prisma error code:", error.code);
      console.error("[PUT /api/documents] Prisma error meta:", JSON.stringify(error.meta));
      
      // Return specific error messages for known Prisma errors
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A document with this data already exists", code: error.code },
          { status: 400 }
        );
      }
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Document not found or was deleted", code: error.code },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Database error: ${error.code}`, code: error.code, details: error.meta },
        { status: 500 }
      );
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("[PUT /api/documents] Prisma validation error:", error.message);
      return NextResponse.json(
        { error: "Invalid data format", details: error.message.slice(0, 500) },
        { status: 400 }
      );
    }
    
    // Log full error stack for unknown errors
    if (error instanceof Error) {
      console.error("[PUT /api/documents] Error stack:", error.stack);
    }
    
    // Return generic error with some details for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update document", details: errorMessage },
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

    // Delete thumbnail from Vercel Blob
    if (document.thumbnailUrl) {
      try {
        await del(document.thumbnailUrl);
      } catch {
        // Ignore if thumbnail doesn't exist
      }
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
