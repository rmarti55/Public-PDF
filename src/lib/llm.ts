import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, generateText, generateObject, tool, stepCountIs } from "ai";
import { z } from "zod";
import { LLM_CONFIG } from "./config";

export const OPENROUTER_MODEL = LLM_CONFIG.model;

// Create OpenRouter provider using OpenAI-compatible interface
const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const CHAT_SYSTEM_PROMPT = `You analyze documents as a bike and pedestrian advocate.

Your perspective:
- Streets should be designed so 8-year-olds and 80-year-olds can safely bike and walk
- Induced demand is real—you can't build your way out of congestion
- Parking minimums destroy cities
- "Level of service" for cars is a policy choice that kills people
- If Amsterdam and Copenhagen did it, American cities have no excuse—just political will
- Move fast: use paint, don't let perfect be the enemy of good

Be concise and direct. Use bullets for lists. Call out car-centric assumptions. Identify opportunities to reallocate road space to people.

Page References:
- Document content is provided in <page number="X"> tags
- When referencing content, use the goToPage tool with the exact page number from the tag
- You can ONLY cite page numbers that appear in the provided content
- The page numbers are guaranteed accurate - use them confidently`;

// Tool definitions for chat
export const chatTools = {
  goToPage: tool({
    description: "Navigate the PDF viewer to a specific page to show the user relevant content",
    inputSchema: z.object({
      pageNumber: z.number().describe("The page number to navigate to (1-indexed)"),
      reason: z.string().describe("Brief description of what's on this page"),
    }),
  }),
};

export async function chat(
  documentContext: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[]
) {
  const systemPrompt = `${CHAT_SYSTEM_PROMPT}

<document>
${documentContext}
</document>`;

  const messages = [
    ...chatHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  return streamText({
    model: openrouter.chatModel(OPENROUTER_MODEL),
    system: systemPrompt,
    messages,
    tools: chatTools,
    stopWhen: stepCountIs(3), // Allow multiple tool calls in one response
  });
}

export async function summarizeDocument(documentText: string): Promise<string> {
  const { text } = await generateText({
    model: openrouter.chatModel(OPENROUTER_MODEL),
    prompt: `Summarize in 2-3 sentences from a bike/pedestrian advocacy lens. What does this mean for people walking, biking, and taking transit? Flag car-centric assumptions or opportunities.\n\n${documentText}`,
  });
  return text;
}

export async function generateDescription(
  documentText: string
): Promise<string> {
  const { text } = await generateText({
    model: openrouter.chatModel(OPENROUTER_MODEL),
    prompt: `One sentence (max 20 words): what does this document mean for bikes, pedestrians, or transit? Frame from an advocacy perspective. Don't start with "This document".\n\n${documentText}`,
  });
  return text;
}

export async function generateTitle(documentText: string): Promise<string> {
  const { text } = await generateText({
    model: openrouter.chatModel(OPENROUTER_MODEL),
    prompt: `Short title (max 10 words). If relevant, frame around bike/pedestrian/transit impact. No quotes or punctuation. Just the title.\n\n${documentText}`,
  });
  return text.trim();
}

// Schema for structured document metadata
export const documentMetadataSchema = z.object({
  title: z.string().describe("Concise title, max 10 words. Frame around bike/pedestrian/transit impact if relevant."),
  description: z.string().describe("One sentence summary (max 30 words) from a bike/pedestrian advocacy lens. Don't start with 'This document'."),
  suggestedCategory: z.enum([
    "Budget",
    "Policy", 
    "Meeting Minutes",
    "Infrastructure",
    "Transit",
    "Planning",
    "Safety",
    "Other"
  ]).describe("The most appropriate category for this document"),
  keyPoints: z.array(z.string()).describe("3-5 key points from a bike/pedestrian advocacy perspective"),
  bikeImpact: z.enum(["positive", "negative", "neutral", "mixed"]).describe("Overall impact on bike/pedestrian infrastructure and safety"),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

/**
 * Analyze a document and extract structured metadata using AI.
 * Returns title, description, category suggestion, key points, and impact assessment.
 */
export async function analyzeDocument(documentText: string): Promise<DocumentMetadata> {
  const { object } = await generateObject({
    model: openrouter.chatModel(OPENROUTER_MODEL),
    schema: documentMetadataSchema,
    prompt: `Analyze this document from a bike and pedestrian advocacy perspective. Extract the key information:

${documentText.slice(0, 15000)}`,
  });
  return object;
}
