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
        `Analysis ${analysisId} failed permanently:`,
        error.message,
      );

      // Update status to failed in the database
      try {
        await db
          .update(chatAnalysis)
          .set({ jobStatus: "failed" })
          .where(eq(chatAnalysis.id, analysisId));
        console.log(`Marked analysis ${analysisId} as failed in database`);
      } catch (dbError) {
        console.error(`Failed to update analysis status:`, dbError);
      }

      // Clean up blob storage even on failure
      try {
        const result = await deleteBlob(blobUrl);
        if (result.success) {
          console.log(`Deleted blob after failure: ${blobUrl}`);
        } else {
          console.error("Error deleting blob after failure:", result.error);
        }
      } catch (blobError) {
        console.error("Error deleting blob after failure:", blobError);
      }
    },
  },
  { event: "analysis.created" },
  async ({ event, step }) => {
    const { analysisId, blobUrl, platform } = event.data;

    // Step 1: Mark analysis as processing
    await step.run("mark-processing", async () => {
      await db
        .update(chatAnalysis)
        .set({ jobStatus: "processing" })
        .where(eq(chatAnalysis.id, analysisId));
    });

    // Step 2: Fetch and parse chat data
    const { stats, messages, participantCount } = await step.run(
      "parse-chat",
      async () => {
        console.log(`Fetching blob: ${blobUrl}`);
        const response = await fetch(blobUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status}`);
        }
        const text = await response.text();
        console.log(`Fetched ${text.length} characters`);

        let stats;
        let chatMessages: { from: string; text: string; date: string }[] = [];

        if (platform === "telegram") {
          console.log("Parsing Telegram chat...");
          const jsonData = JSON.parse(text);
          const result = await parseTelegramChatData(jsonData);
          stats = result.stats;
          chatMessages = result.messages;
        } else if (platform === "whatsapp") {
          console.log("Parsing WhatsApp chat...");
          const result = await parseWhatsappChatData(text);
          stats = result.stats;
          chatMessages = result.messages;
        } else if (platform === "instagram") {
          console.log("Parsing Instagram chat...");
          const jsonData = JSON.parse(text);
          const result = await parseInstagramChatData(jsonData);
          stats = result.stats;
          chatMessages = result.messages;
        } else {
          throw new Error(`Unsupported platform: ${platform}`);
        }

        const participantCount = Object.keys(stats.messagesByUser).length;
        console.log(
          `Parsed: ${chatMessages.length} messages, ${participantCount} participants`,
        );

        return { stats, messages: chatMessages, participantCount };
      },
    );

    // Step 3: Update analysis with stats
    await step.run("save-stats", async () => {
      await db
        .update(chatAnalysis)
        .set({
          stats,
          totalMessages: stats.totalMessages || 0,
          totalWords: stats.totalWords || 0,
          participantCount,
        })
        .where(eq(chatAnalysis.id, analysisId));
      console.log("Stats saved to database");
    });

    // Step 4: Generate embeddings
    if (messages.length > 0) {
      await step.run("generate-embeddings", async () => {
        // Delete any existing embeddings (for idempotency on retries)
        await deleteEmbeddings(analysisId);
        // Generate and store embeddings
        await embedAndStoreMessages(analysisId, messages);
        console.log(`Generated embeddings for ${messages.length} messages`);
      });
    }

    // Step 5: Mark analysis as ready
    await step.run("mark-ready", async () => {
      await db
        .update(chatAnalysis)
        .set({ jobStatus: "ready" })
        .where(eq(chatAnalysis.id, analysisId));
    });

    // Step 6: Clean up blob storage
    await step.run("cleanup-blob", async () => {
      try {
        const result = await deleteBlob(blobUrl);
        if (result.success) {
          console.log(`Deleted blob: ${blobUrl}`);
        } else {
          console.error("Error deleting blob:", result.error);
        }
      } catch (error) {
        console.error("Error deleting blob:", error);
        // Don't fail the job for cleanup errors
      }
    });

    return { success: true, analysisId };
  },
);

// Export all functions for the serve handler
export const functions = [processAnalysis];
