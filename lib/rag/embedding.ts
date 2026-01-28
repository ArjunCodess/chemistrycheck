import { embed } from "ai";
import { google } from "@ai-sdk/google";

/**
 * Generate embedding for text using Gemini's gemini-embedding-001 model
 * Uses 1536 dimensions for rich semantic capture of long chat conversations
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embeddingModel("gemini-embedding-001"),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: 1536,
      },
    },
  });
  return embedding;
}
