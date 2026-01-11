import { NextRequest, NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/llm";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    // Analyze document and get structured metadata
    const metadata = await analyzeDocument(text);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error analyzing document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze document" },
      { status: 500 }
    );
  }
}
