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
      const openrouter = createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openrouter(model);
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

export async function chat(
  documentContext: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[]
) {
  const model = getProvider();

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

  const result = await streamText({
    model,
    system: systemPrompt,
    messages,
  });

  return result;
}

export async function summarizeDocument(documentText: string): Promise<string> {
  const model = getProvider();

  const result = await generateText({
    model,
    prompt: `Please provide a brief summary (2-3 sentences) of the following document:

${documentText}`,
  });

  return result.text;
}

export async function generateDescription(documentText: string): Promise<string> {
  const model = getProvider();

  const result = await generateText({
    model,
    prompt: `Write a single concise sentence (max 20 words) describing what this document is about. Focus on the main topic and purpose. Do not start with "This document" - just state what it is directly.

Document content:
${documentText}`,
  });

  return result.text;
}
