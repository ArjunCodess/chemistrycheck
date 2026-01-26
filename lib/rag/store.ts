import { db, messageEmbeddings } from "@/db";
import { generateEmbedding } from "./embedding";
import { chunkMessages, type Message } from "./chunking";

/**
 * Embed and store messages for a given analysis
 * @param onProgress - Optional callback for progress updates (current, total)
 */
export async function embedAndStoreMessages(
  analysisId: string,
  messages: Message[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const chunks = chunkMessages(messages);
  const total = chunks.length;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk.content);

    await db.insert(messageEmbeddings).values({
      analysisId,
      chunkContent: chunk.content,
      chunkIndex: chunk.chunkIndex,
      startTimestamp: chunk.startTimestamp,
      endTimestamp: chunk.endTimestamp,
      messageCount: chunk.messageCount,
      embedding,
    });

    // Report progress
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }
}

/**
 * Delete all embeddings for an analysis (for re-embedding)
 */
export async function deleteEmbeddings(analysisId: string): Promise<void> {
  const { eq } = await import("drizzle-orm");
  await db
    .delete(messageEmbeddings)
    .where(eq(messageEmbeddings.analysisId, analysisId));
}
