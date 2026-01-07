import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTitle } from "@/lib/llm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({
      where: { id },
      select: { extractedText: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!document.extractedText || document.extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: "No text content available for this document" },
        { status: 400 }
      );
    }

    // Limit text to first ~5000 characters (title needs less context)
    const truncatedText = document.extractedText.slice(0, 5000);

    const title = await generateTitle(truncatedText);

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
}
