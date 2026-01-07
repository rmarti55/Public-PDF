import { NextRequest, NextResponse } from "next/server";
import { summarizeDocument } from "@/lib/llm";

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

    // Limit text to first ~10000 characters to avoid token limits
    const truncatedText = text.slice(0, 10000);

    // Generate summary
    const summary = await summarizeDocument(truncatedText);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error summarizing document:", error);
    return NextResponse.json(
      { error: "Failed to summarize document" },
      { status: 500 }
    );
  }
}
