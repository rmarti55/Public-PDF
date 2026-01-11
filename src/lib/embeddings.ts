/**
 * Embeddings generation for RAG page-level retrieval
 */

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";

export interface EmbeddingResult {
  embedding: number[];
  pageNumber: number;
  content: string;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Limit text length for embedding
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple pages
 */
export async function generatePageEmbeddings(
  pages: { pageNumber: number; content: string }[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  
  // Process pages in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (page) => {
        const embedding = await generateEmbedding(page.content);
        return {
          embedding,
          pageNumber: page.pageNumber,
          content: page.content,
        };
      })
    );
    
    results.push(...batchResults);
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < pages.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
