import { embed } from "ai";
import { google } from "@ai-sdk/google";

/**
 * Generate embedding for text using Gemini's text-embedding-004 model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: text,
  });
  return embedding;
}
