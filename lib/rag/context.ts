import type { SearchResult } from "./search";

/**
 * Build context string from retrieved message chunks
 */
export function buildContext(chunks: SearchResult[]): string {
  if (chunks.length === 0) return "No relevant messages found.";

  return chunks
    .map((chunk, i) => `[Relevant Conversation ${i + 1}]\n${chunk.content}`)
    .join("\n\n---\n\n");
}
