import { NextRequest, NextResponse } from "next/server";
import { summarizeDocument } from "@/lib/llm";

export async function POST(request: NextRequest) {
  console.log("[/api/summarize] POST request received");
  
  try {
    const { text } = await request.json();

    console.log("[/api/summarize] Text received:", !!text);
    console.log("[/api/summarize] Text type:", typeof text);
    console.log("[/api/summarize] Text length:", text?.length || 0);

    if (!text || typeof text !== "string") {
      console.log("[/api/summarize] Error: No text provided or invalid type");
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (text.trim().length === 0) {
      console.log("[/api/summarize] Error: Empty text after trim");
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    // Limit text to first ~10000 characters to avoid token limits
    const truncatedText = text.slice(0, 10000);
    console.log("[/api/summarize] Truncated text length:", truncatedText.length);
    console.log("[/api/summarize] Calling summarizeDocument...");

    // Generate summary
    const summary = await summarizeDocument(truncatedText);

    console.log("[/api/summarize] Summary generated successfully");
    console.log("[/api/summarize] Summary length:", summary?.length || 0);
    
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[/api/summarize] ERROR caught:");
    console.error("[/api/summarize] Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("[/api/summarize] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[/api/summarize] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to summarize document" },
      { status: 500 }
    );
  }
}
