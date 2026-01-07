import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTextFromPDF } from "@/lib/pdf";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET all documents (public only gets published, admin gets all)
export async function GET(request: NextRequest) {
  console.log("[GET /api/documents] Request received");
  const isAdmin = request.headers.get("x-admin-auth") === "true";
  console.log("[GET /api/documents] isAdmin:", isAdmin);

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
      // NOTE: context excluded from listing to keep response size small
      // Fetch individual document for full context
    },
  });

  const responseSize = JSON.stringify(documents).length;
  console.log("[GET /api/documents] Returning", documents.length, "documents, response size:", responseSize, "bytes");

  return NextResponse.json(documents);
}

// POST create new document (admin only)
export async function POST(request: NextRequest) {
  console.log("[POST /api/documents] Request received");
  
  try {
    console.log("[POST /api/documents] Parsing formData...");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string | null;
    const context = formData.get("context") as string | null;
    const published = formData.get("published") === "true";

    console.log("[POST /api/documents] File:", file?.name, "Size:", file?.size, "bytes");
    console.log("[POST /api/documents] Title:", title);
    console.log("[POST /api/documents] Description length:", description?.length || 0);

    if (!file) {
      console.log("[POST /api/documents] Error: No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      console.log("[POST /api/documents] Error: No title provided");
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Upload file to Vercel Blob
    console.log("[POST /api/documents] Uploading to Vercel Blob...");
    const blob = await put(file.name, file, {
      access: "public",
    });
    console.log("[POST /api/documents] Blob URL:", blob.url);

    // Extract text from PDF
    console.log("[POST /api/documents] Extracting text from PDF...");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let extractedText = "";
    try {
      extractedText = await extractTextFromPDF(buffer);
      console.log("[POST /api/documents] Extracted text length:", extractedText.length);
    } catch (error) {
      console.error("[POST /api/documents] Error extracting PDF text:", error);
      // Continue even if extraction fails
    }

    // Create document in database
    console.log("[POST /api/documents] Creating document in database...");
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
    console.log("[POST /api/documents] Document created with ID:", document.id);

    // Exclude extractedText from response to avoid payload size limits
    const { extractedText: _, ...documentWithoutText } = document;
    const responseSize = JSON.stringify(documentWithoutText).length;
    console.log("[POST /api/documents] Response size (without extractedText):", responseSize, "bytes");
    
    return NextResponse.json(documentWithoutText, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documents] Error:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
