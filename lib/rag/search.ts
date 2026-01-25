import { db, messageEmbeddings } from "@/db";
import { cosineDistance, desc, sql, eq } from "drizzle-orm";
import { generateEmbedding } from "./embedding";

export interface SearchResult {
  content: string;
  sender: string;
  similarity: number;
  startTimestamp: Date | null;
}

/**
 * Find relevant message chunks for a given query
 */
export async function findRelevantMessages(
  analysisId: string,
  query: string,
  limit: number = 5,
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);

  const similarity = sql<number>`1 - (${cosineDistance(
    messageEmbeddings.embedding,
    queryEmbedding,
  )})`;

  const results = await db
    .select({
      content: messageEmbeddings.chunkContent,
      sender: messageEmbeddings.sender,
      startTimestamp: messageEmbeddings.startTimestamp,
      similarity,
    })
    .from(messageEmbeddings)
    .where(eq(messageEmbeddings.analysisId, analysisId))
    .orderBy(desc(similarity))
    .limit(limit);

  return results;
}

/**
 * Check if embeddings exist for a given analysis
 */
export async function checkEmbeddingsExist(
  analysisId: string,
): Promise<boolean> {
  const { count } = await import("drizzle-orm");

  const [result] = await db
    .select({ count: count() })
    .from(messageEmbeddings)
    .where(eq(messageEmbeddings.analysisId, analysisId));

  return (result?.count ?? 0) > 0;
}
