import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
      thumbnailUrl: true,
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
// Now accepts JSON with pre-uploaded blob URL (no file in request body)
export async function POST(request: NextRequest) {
  console.log("[POST /api/documents] Request received");
  
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

    console.log("[POST /api/documents] Title:", title);
    console.log("[POST /api/documents] File:", fileName);
    console.log("[POST /api/documents] Blob URL:", filePath);
    console.log("[POST /api/documents] Thumbnail URL:", thumbnailUrl || "(none)");
    console.log("[POST /api/documents] Extracted text length:", extractedText?.length || 0);

    if (!title) {
      console.log("[POST /api/documents] Error: No title provided");
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!filePath) {
      console.log("[POST /api/documents] Error: No file path provided");
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    // Create document in database
    console.log("[POST /api/documents] Creating document in database...");
    const document = await prisma.document.create({
      data: {
        title,
        description: description || null,
        category: category || null,
        fileName: fileName || "document.pdf",
        filePath,
        thumbnailUrl: thumbnailUrl || null,
        extractedText: extractedText || "",
        context: context || null,
        published: published || false,
      },
    });
    console.log("[POST /api/documents] Document created with ID:", document.id);

    // Exclude extractedText from response to avoid payload size limits
    const { extractedText: _, ...documentWithoutText } = document;
    console.log("[POST /api/documents] Response size:", JSON.stringify(documentWithoutText).length, "bytes");
    
    return NextResponse.json(documentWithoutText, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documents] Error:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
