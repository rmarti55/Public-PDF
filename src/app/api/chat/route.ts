import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/llm";
import { searchRelevantPages, buildPageContext } from "@/lib/vector-search";

export async function POST(request: NextRequest) {
  try {
    const { documentId, message, history } = await request.json();

    if (!documentId || !message) {
      return new Response(
        JSON.stringify({ error: "Document ID and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { extractedText: true, title: true, published: true },
    });

    if (!document || !document.published) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save the user message to database
    await prisma.chatMessage.create({
      data: {
        documentId,
        role: "user",
        content: message,
      },
    });

    // Check if we have page chunks for RAG
    const pageChunkCount = await prisma.pageChunk.count({
      where: { documentId },
    });

    let documentContext: string;
    
    if (pageChunkCount > 0) {
      // RAG mode: search for relevant pages and only use those
      console.log("[Chat] Using RAG mode with", pageChunkCount, "page chunks");
      const relevantPages = await searchRelevantPages(documentId, message, 8);
      const pageContext = buildPageContext(relevantPages);
      documentContext = `Title: ${document.title}\n\nRelevant pages from the document:\n\n${pageContext}`;
      console.log("[Chat] Found", relevantPages.length, "relevant pages:", relevantPages.map(p => p.pageNumber).join(", "));
    } else {
      // Fallback: use full extracted text (backward compatibility)
      console.log("[Chat] No page chunks found, using full text fallback");
      documentContext = `Title: ${document.title}\n\n${document.extractedText}`;
    }

    // Sanitize chat history - filter out empty messages and ensure content is string
    const chatHistory = (history || [])
      .filter((m: { role: string; content: string }) => m.content && m.content.trim())
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).trim(),
      }));

    const result = await chat(documentContext, message, chatHistory);

    // Consume stream to ensure onFinish fires even if client disconnects
    result.consumeStream();

    // Return the stream response with onFinish callback to save assistant message
    return result.toUIMessageStreamResponse({
      onFinish: async ({ responseMessage }) => {
        // Extract text from UIMessage parts array
        const text = responseMessage?.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("") || "";
          
        if (text.trim()) {
          try {
            await prisma.chatMessage.create({
              data: {
                documentId,
                role: "assistant",
                content: text,
              },
            });
          } catch (error) {
            console.error("Error saving assistant message:", error);
          }
        }
      },
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
