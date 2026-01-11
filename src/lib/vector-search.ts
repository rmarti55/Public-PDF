/**
 * Vector similarity search for RAG retrieval
 */

import { prisma } from "./db";
import { generateEmbedding } from "./embeddings";

interface PageChunkWithScore {
  pageNumber: number;
  content: string;
  score: number;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

/**
 * Search for most relevant pages given a query
 */
export async function searchRelevantPages(
  documentId: string,
  query: string,
  topK: number = 5
): Promise<PageChunkWithScore[]> {
  // Get all page chunks for this document
  const pageChunks = await prisma.pageChunk.findMany({
    where: { documentId },
    select: {
      pageNumber: true,
      content: true,
      embedding: true,
    },
  });
  
  if (pageChunks.length === 0) {
    return [];
  }
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Calculate similarity scores for each page
  const scoredPages = pageChunks.map((chunk) => {
    const embedding = chunk.embedding as number[];
    const score = cosineSimilarity(queryEmbedding, embedding);
    return {
      pageNumber: chunk.pageNumber,
      content: chunk.content,
      score,
    };
  });
  
  // Sort by score descending and take top K
  scoredPages.sort((a, b) => b.score - a.score);
  
  return scoredPages.slice(0, topK);
}

/**
 * Build context string from relevant pages for LLM
 */
export function buildPageContext(pages: PageChunkWithScore[]): string {
  // Sort by page number for logical reading order
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  
  return sortedPages
    .map((p) => `<page number="${p.pageNumber}">\n${p.content}\n</page>`)
    .join("\n\n");
}
