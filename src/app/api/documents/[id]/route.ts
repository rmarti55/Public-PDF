import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unlink, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { extractTextFromPDF } from "@/lib/pdf";

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

  return NextResponse.json(document);
}

// PUT update document (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string | null;
    const context = formData.get("context") as string | null;
    const published = formData.get("published") === "true";

    const existingDoc = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {
      title,
      description,
      category,
      context,
      published,
    };

    // If a new file is uploaded
    if (file && file.size > 0) {
      // Delete old file
      const oldFilePath = path.join(process.cwd(), "public", existingDoc.filePath);
      try {
        await unlink(oldFilePath);
      } catch {
        // Ignore if file doesn't exist
      }

      // Save new file
      const fileExtension = path.extname(file.name);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      const filePath = path.join(uploadDir, uniqueFileName);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Extract text from new PDF
      let extractedText = "";
      try {
        extractedText = await extractTextFromPDF(buffer);
      } catch (error) {
        console.error("Error extracting PDF text:", error);
      }

      updateData = {
        ...updateData,
        fileName: file.name,
        filePath: `/uploads/${uniqueFileName}`,
        extractedText,
      };
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error updating document:", error);
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

    // Delete file from disk
    const filePath = path.join(process.cwd(), "public", document.filePath);
    try {
      await unlink(filePath);
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
