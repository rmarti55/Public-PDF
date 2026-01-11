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

    // Consume stream to ensure onFinish fires even if client disconnects
    result.consumeStream();

    // Return the stream response with onFinish callback to save assistant message
    return result.toUIMessageStreamResponse({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onFinish: async (event: any) => {
        const responseMessage = event.responseMessage;
        const text = typeof responseMessage?.content === 'string' 
          ? responseMessage.content 
          : Array.isArray(responseMessage?.content) 
            ? responseMessage.content.map((p: { text?: string }) => p.text || '').join('')
            : '';
        if (text?.trim()) {
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
