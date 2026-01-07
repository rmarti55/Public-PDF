import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTextFromPDF } from "@/lib/pdf";
import { put } from "@vercel/blob";

// GET all documents (public only gets published, admin gets all)
export async function GET(request: NextRequest) {
  const isAdmin = request.headers.get("x-admin-auth") === "true";

  const documents = await prisma.document.findMany({
    where: isAdmin ? {} : { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      fileName: true,
      filePath: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      context: true,
    },
  });

  return NextResponse.json(documents);
}

// POST create new document (admin only)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string | null;
    const context = formData.get("context") as string | null;
    const published = formData.get("published") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Upload file to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
    });

    // Extract text from PDF
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let extractedText = "";
    try {
      extractedText = await extractTextFromPDF(buffer);
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      // Continue even if extraction fails
    }

    // Create document in database
    const document = await prisma.document.create({
      data: {
        title,
        description,
        category,
        fileName: file.name,
        filePath: blob.url,
        extractedText,
        context,
        published,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
