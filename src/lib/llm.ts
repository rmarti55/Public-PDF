import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type LLMProvider = "openai" | "anthropic" | "google" | "openrouter";

function getProvider() {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || "openrouter";
  const model = process.env.LLM_MODEL || getDefaultModel(provider);

  switch (provider) {
    case "openai":
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai(model);
    case "anthropic":
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(model);
    case "google":
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
      });
      return google(model);
    case "openrouter":
      // For OpenRouter, we'll use direct API calls
      return null;
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "openai":
      return "gpt-4o";
    case "anthropic":
      return "claude-sonnet-4-20250514";
    case "google":
      return "gemini-1.5-pro";
    case "openrouter":
      return "anthropic/claude-3.5-sonnet";
    default:
      return "gpt-4o";
  }
}

// Direct OpenRouter streaming implementation
async function openRouterStream(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  const model = process.env.LLM_MODEL || "anthropic/claude-3.5-sonnet";
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  // Transform the SSE stream to just text content
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
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || "openrouter";

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

  // Use direct API for OpenRouter
  if (provider === "openrouter") {
    const stream = await openRouterStream(systemPrompt, messages);
    return {
      toTextStreamResponse: () => new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    };
  }

  // Use AI SDK for other providers
  const model = getProvider();
  if (!model) throw new Error("Provider not configured");

  const result = await streamText({
    model,
    system: systemPrompt,
    messages,
  });

  return result;
}

export async function summarizeDocument(documentText: string): Promise<string> {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || "openrouter";
  
  console.log("[summarizeDocument] Starting summarization");
  console.log("[summarizeDocument] Provider:", provider);
  console.log("[summarizeDocument] Document text length:", documentText.length);
  
  if (provider === "openrouter") {
    const model = process.env.LLM_MODEL || "anthropic/claude-3.5-sonnet";
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    console.log("[summarizeDocument] Model:", model);
    console.log("[summarizeDocument] API key present:", !!apiKey);
    console.log("[summarizeDocument] API key length:", apiKey?.length || 0);
    
    if (!apiKey) {
      console.error("[summarizeDocument] ERROR: OPENROUTER_API_KEY is not set!");
      throw new Error("OpenRouter API key is not configured");
    }
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `Please provide a brief summary (2-3 sentences) of the following document:\n\n${documentText}`,
          },
        ],
      }),
    });

    console.log("[summarizeDocument] OpenRouter response status:", response.status);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[summarizeDocument] OpenRouter API error:");
      console.error("[summarizeDocument] Status:", response.status);
      console.error("[summarizeDocument] Status Text:", response.statusText);
      console.error("[summarizeDocument] Error body:", errorBody);
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    console.log("[summarizeDocument] Success! Response received");
    return data.choices[0].message.content;
  }

  const model = getProvider();
  if (!model) throw new Error("Provider not configured");

  const result = await generateText({
    model,
    prompt: `Please provide a brief summary (2-3 sentences) of the following document:\n\n${documentText}`,
  });

  return result.text;
}

export async function generateDescription(documentText: string): Promise<string> {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || "openrouter";
  
  if (provider === "openrouter") {
    const model = process.env.LLM_MODEL || "anthropic/claude-3.5-sonnet";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `Write a single concise sentence (max 20 words) describing what this document is about. Focus on the main topic and purpose. Do not start with "This document" - just state what it is directly.\n\nDocument content:\n${documentText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate description");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  const model = getProvider();
  if (!model) throw new Error("Provider not configured");

  const result = await generateText({
    model,
    prompt: `Write a single concise sentence (max 20 words) describing what this document is about. Focus on the main topic and purpose. Do not start with "This document" - just state what it is directly.\n\nDocument content:\n${documentText}`,
  });

  return result.text;
}

export async function generateTitle(documentText: string): Promise<string> {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || "openrouter";
  
  if (provider === "openrouter") {
    const model = process.env.LLM_MODEL || "anthropic/claude-3.5-sonnet";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `Generate a short, descriptive title for this document (max 10 words). The title should be clear and professional, like a document heading. Do not use quotes or punctuation at the end. Just output the title, nothing else.\n\nDocument content:\n${documentText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate title");
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  const model = getProvider();
  if (!model) throw new Error("Provider not configured");

  const result = await generateText({
    model,
    prompt: `Generate a short, descriptive title for this document (max 10 words). The title should be clear and professional, like a document heading. Do not use quotes or punctuation at the end. Just output the title, nothing else.\n\nDocument content:\n${documentText}`,
  });

  return result.text.trim();
}
