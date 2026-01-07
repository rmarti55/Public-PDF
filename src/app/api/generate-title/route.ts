import { NextRequest, NextResponse } from "next/server";
import { generateTitle } from "@/lib/llm";

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

    // Limit text to first ~5000 characters (title needs less context)
    const truncatedText = text.slice(0, 5000);

    // Generate title
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
