export const OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function streamOpenRouter(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${error}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    },
  });
}

export async function chat(
  documentContext: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[]
) {
  const systemPrompt = `You are a helpful assistant that answers questions about a specific document. 
Here is the document content for context:

<document>
${documentContext}
</document>

Please answer questions based on this document. If the question cannot be answered from the document, 
say so clearly. Be concise and accurate in your responses.`;

  const messages = [
    ...chatHistory,
    { role: "user" as const, content: userMessage },
  ];

  const stream = await streamOpenRouter(systemPrompt, messages);

  return {
    stream,
    toTextStreamResponse: () =>
      new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
  };
}

export async function summarizeDocument(documentText: string): Promise<string> {
  return callOpenRouter([
    {
      role: "user",
      content: `Please provide a brief summary (2-3 sentences) of the following document:\n\n${documentText}`,
    },
  ]);
}

export async function generateDescription(
  documentText: string
): Promise<string> {
  return callOpenRouter([
    {
      role: "user",
      content: `Write a single concise sentence (max 20 words) describing what this document is about. Focus on the main topic and purpose. Do not start with "This document" - just state what it is directly.\n\nDocument content:\n${documentText}`,
    },
  ]);
}

export async function generateTitle(documentText: string): Promise<string> {
  const title = await callOpenRouter([
    {
      role: "user",
      content: `Generate a short, descriptive title for this document (max 10 words). The title should be clear and professional, like a document heading. Do not use quotes or punctuation at the end. Just output the title, nothing else.\n\nDocument content:\n${documentText}`,
    },
  ]);
  return title.trim();
}
