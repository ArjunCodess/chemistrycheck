import { db, messageEmbeddings } from "@/db";
import { generateEmbedding } from "./embedding";
import { chunkMessages, type Message } from "./chunking";

/**
 * Embed and store messages for a given analysis
 */
export async function embedAndStoreMessages(
  analysisId: string,
  messages: Message[],
): Promise<void> {
  const chunks = chunkMessages(messages);

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);

    await db.insert(messageEmbeddings).values({
      analysisId,
      chunkContent: chunk.content,
      sender: chunk.sender,
      chunkIndex: chunk.chunkIndex,
      startTimestamp: chunk.startTimestamp,
      endTimestamp: chunk.endTimestamp,
      messageCount: chunk.messageCount,
      embedding,
    });
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
