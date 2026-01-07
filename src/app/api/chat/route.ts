import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/llm";

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

    // Create a transform stream to collect the response and save it
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    let fullResponse = "";

    // Process the stream in the background
    (async () => {
      try {
        for await (const chunk of result.textStream) {
          fullResponse += chunk;
          await writer.write(encoder.encode(chunk));
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
        console.error("Error processing stream:", error);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
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
