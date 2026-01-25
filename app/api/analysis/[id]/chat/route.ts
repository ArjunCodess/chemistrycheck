import { streamText, UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import {
  findRelevantMessages,
  buildContext,
  checkEmbeddingsExist,
} from "@/lib/rag";
import { NextRequest } from "next/server";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an AI assistant helping the user explore their chat history. 

Writing style:
- Write like a real human, professional but natural
- Explain things like you're talking to a smart friend over coffee
- Avoid buzzwords, corporate jargon, and em dashes
- Be clear, direct, conversational and real
- Never sound like a press release

You have access to excerpts from their conversation:
{context}

Guidelines:
- Quote specific messages when relevant
- If asked about something not in the excerpts, say "I couldn't find that in the messages I searched, but you can try asking differently"
- Be helpful in identifying patterns, finding specific moments, or summarizing parts of the conversation
- Respect the privacy and sensitivity of personal conversations
- If the context contains "NO_EMBEDDINGS_FOUND", explicitly tell the user: "I can't answer questions about this chat because it hasn't been indexed for search. Please analyze this chat again to enable search features." and provide this link: [Create New Analysis](/new)`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: analysisId } = await params;
    const { messages }: { messages: UIMessage[] } = await req.json();

    // Get the latest user message for RAG retrieval
    const lastMessage = messages[messages.length - 1];
    const userQuery =
      lastMessage?.parts?.find(
        (part): part is { type: "text"; text: string } => part.type === "text",
      )?.text ?? "";

    // Retrieve relevant message chunks
    let context = "";
    try {
      const hasEmbeddings = await checkEmbeddingsExist(analysisId);

      if (!hasEmbeddings) {
        context =
          "NO_EMBEDDINGS_FOUND: This analysis is old and does not have a searchable index.";
      } else {
        const relevantChunks = await findRelevantMessages(
          analysisId,
          userQuery,
          5,
        );
        context = buildContext(relevantChunks);
      }
    } catch (error) {
      console.error("Error retrieving context:", error);
      context = "Unable to search through messages.";
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{context}", context);

    const result = streamText({
      model: google("gemini-3-flash-preview"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
