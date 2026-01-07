import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { chat, OPENROUTER_MODEL } from "@/lib/llm";

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

    const documentContext = `Title: ${document.title}\n\n${document.extractedText}`;
    
    // Sanitize chat history - filter out empty messages and ensure content is string
    const chatHistory = (history || [])
      .filter((m: { role: string; content: string }) => m.content && m.content.trim())
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).trim(),
      }));

    const result = await chat(documentContext, message, chatHistory);

    // Tee the stream - one for response, one for capturing content to save
    const [responseStream, captureStream] = result.stream.tee();

    // Capture full response in background for DB save
    (async () => {
      try {
        const reader = captureStream.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value, { stream: true });
        }
        
        // Save the assistant response to database after stream completes
        if (fullResponse.trim()) {
          await prisma.chatMessage.create({
            data: {
              documentId,
              role: "assistant",
              content: fullResponse,
            },
          });
        }
      } catch (error) {
        console.error("Error capturing stream:", error);
      }
    })();

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Model-Name": OPENROUTER_MODEL,
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
