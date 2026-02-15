import { inngest } from "./client";
import { db } from "@/db";
import { chatAnalysis } from "@/db/schema";
import { eq } from "drizzle-orm";
import { embedAndStoreMessages, deleteEmbeddings } from "@/lib/rag";
import { deleteBlob } from "@/actions/blob";

// Import parsers
import { parseChatData as parseTelegramChatData } from "@/lib/chat-parser/telegram";
import { parseChatData as parseInstagramChatData } from "@/lib/chat-parser/instagram";
import { parseChatData as parseWhatsappChatData } from "@/lib/chat-parser/whatsapp";

/**
 * Background function to parse chat and generate embeddings.
 * Handles all heavy processing: fetch blob → parse → save stats → embed.
 */
export const processAnalysis = inngest.createFunction(
  {
    id: "process-analysis",
    retries: 3,
    onFailure: async ({ event, error }) => {
      // This runs after all retries are exhausted
      const { analysisId, blobUrl } = event.data.event.data;
      console.error(
        `[inngest] Analysis ${analysisId} failed permanently: ${error.message}`,
      );

      try {
        await db
          .update(chatAnalysis)
          .set({ jobStatus: "failed" })
          .where(eq(chatAnalysis.id, analysisId));
      } catch (dbError) {
        console.error(`[inngest] Failed to update analysis status:`, dbError);
      }

      try {
        await deleteBlob(blobUrl);
      } catch (blobError) {
        console.error(
          "[inngest] Error deleting blob after failure:",
          blobError,
        );
      }
    },
  },
  { event: "analysis.created" },
  async ({ event, step }) => {
    const { analysisId, blobUrl, platform } = event.data;
    console.log(`[inngest] Starting analysis ${analysisId} for ${platform}`);

    // Step 1: Mark analysis as processing
    await step.run("mark-processing", async () => {
      await db
        .update(chatAnalysis)
        .set({ jobStatus: "processing" })
        .where(eq(chatAnalysis.id, analysisId));
    });

    // Step 2: Fetch, parse, save stats, and generate embeddings
    // All done in one step to avoid serializing the full messages array
    // between steps (which causes output_too_large on large chats)
    await step.run("parse-and-embed", async () => {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.status}`);
      }
      const text = await response.text();
      console.log(`[inngest] Fetched ${text.length} chars for ${platform}`);

      let stats;
      let chatMessages: { from: string; text: string; date: string }[] = [];

      if (platform === "telegram") {
        const jsonData = JSON.parse(text);
        const result = await parseTelegramChatData(jsonData);
        stats = result.stats;
        chatMessages = result.messages;
      } else if (platform === "whatsapp") {
        const result = await parseWhatsappChatData(text);
        stats = result.stats;
        chatMessages = result.messages;
      } else if (platform === "instagram") {
        const jsonData = JSON.parse(text);
        const result = await parseInstagramChatData(jsonData);
        stats = result.stats;
        chatMessages = result.messages;
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const participantCount = Object.keys(stats.messagesByUser).length;
      console.log(
        `[inngest] Parsed: ${chatMessages.length} messages, ${participantCount} participants`,
      );

      // Save stats to database
      await db
        .update(chatAnalysis)
        .set({
          stats,
          totalMessages: stats.totalMessages || 0,
          totalWords: stats.totalWords || 0,
          participantCount,
        })
        .where(eq(chatAnalysis.id, analysisId));
      console.log(`[inngest] Stats saved for analysis ${analysisId}`);

      // Generate embeddings
      if (chatMessages.length > 0) {
        await deleteEmbeddings(analysisId);
        await embedAndStoreMessages(analysisId, chatMessages);
        console.log(
          `[inngest] Generated embeddings for ${chatMessages.length} messages`,
        );
      }
    });

    // Step 3: Mark analysis as ready
    await step.run("mark-ready", async () => {
      await db
        .update(chatAnalysis)
        .set({ jobStatus: "ready" })
        .where(eq(chatAnalysis.id, analysisId));
    });

    // Step 4: Clean up blob storage
    await step.run("cleanup-blob", async () => {
      try {
        await deleteBlob(blobUrl);
      } catch (error) {
        console.error("[inngest] Error deleting blob:", error);
      }
    });

    console.log(`[inngest] Analysis ${analysisId} completed successfully`);
    return { success: true, analysisId };
  },
);

// Export all functions for the serve handler
export const functions = [processAnalysis];
