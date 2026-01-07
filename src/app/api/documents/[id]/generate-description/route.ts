import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDescription } from "@/lib/llm";

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

    // Limit text to first ~10000 characters to avoid token limits
    const truncatedText = document.extractedText.slice(0, 10000);

    const description = await generateDescription(truncatedText);

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Error generating description:", error);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
