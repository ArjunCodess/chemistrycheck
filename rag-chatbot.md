# RAG Chatbot for ChemistryCheck

A conversational AI assistant that lets users search and ask questions about their uploaded chat exports.

## Overview

Users upload their WhatsApp/Instagram/Telegram chats → we parse them, generate stats, AND embed the messages → users can then chat with an AI that has full context of their conversation history.

**Location:** Sidebar in the Analysis Dashboard (`/dashboard/[id]`)
**Embedding Model:** Gemini `text-embedding-004` (768 dimensions)
**LLM:** Gemini `gemini-3-flash-preview`
**Vector DB:** pgvector extension on Neon PostgreSQL
**ORM:** Drizzle ORM

---

## Architecture

### Upload Flow

When a user uploads their chat export, the system processes it in the following order:

1. **Parse messages** from the raw export file (WhatsApp/Instagram/Telegram format)
2. **Generate stats** (message counts, response times, activity patterns, etc.)
3. **Generate AI insights** using Gemini (relationship health, attachment styles, etc.)
4. **Chunk messages** into groups of 5-10 messages for embedding
5. **Generate embeddings** for each chunk using Gemini's `text-embedding-004`
6. **Store embeddings** in the `message_embeddings` table with pgvector

### Query Flow

When a user asks a question in the chat sidebar:

1. **Embed the query** using the same embedding model
2. **Similarity search** against all chunks for that analysis using cosine distance
3. **Retrieve top 5 chunks** most relevant to the query
4. **Build context** by formatting the retrieved chunks
5. **Stream response** from Gemini with the context injected into the system prompt

### Storage Note

**We do NOT persist the user's chat messages in the sidebar.** The conversation history only lives in the browser session. When the user closes the page or refreshes, the chat history is gone. This keeps things simple and avoids storing potentially sensitive questions users ask about their relationships.

---

## Database Schema

### New Table: `message_embeddings`

```sql
CREATE TABLE message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES chat_analysis(id) ON DELETE CASCADE,
  chunk_content TEXT NOT NULL,           -- The actual message text
  sender TEXT NOT NULL,                   -- Who sent the message
  chunk_index INTEGER NOT NULL,           -- Order in conversation
  start_timestamp TIMESTAMP,              -- When the first message in chunk was sent
  end_timestamp TIMESTAMP,                -- When the last message in chunk was sent
  message_count INTEGER NOT NULL,         -- How many messages in this chunk
  embedding VECTOR(768) NOT NULL,         -- Gemini text-embedding-004 is 768 dims
  created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX embedding_idx ON message_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Index for filtering by analysis
CREATE INDEX analysis_id_idx ON message_embeddings(analysis_id);
```

### Drizzle Schema

```typescript
import { pgTable, uuid, text, integer, timestamp, vector, index } from "drizzle-orm/pg-core";
import { chatAnalysis } from "./schema";

export const messageEmbeddings = pgTable(
  "message_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => chatAnalysis.id, { onDelete: "cascade" }),
    chunkContent: text("chunk_content").notNull(),
    sender: text("sender").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    startTimestamp: timestamp("start_timestamp"),
    endTimestamp: timestamp("end_timestamp"),
    messageCount: integer("message_count").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    index("analysis_id_idx").on(table.analysisId),
  ]
);
```

---

## Chunking Strategy

Individual messages are too short for good embeddings. We'll chunk conversations into blocks.

### Approach: Sliding Window with Context

- **Chunk size:** 5-10 messages per chunk
- **Overlap:** 2 messages (so context isn't lost at boundaries)
- **Format per chunk:**

```
[Conversation between {User1} and {User2}]
[{timestamp}] {sender}: {message}
[{timestamp}] {sender}: {message}
...
```

### Example Chunk

```
[Conversation between John and Sarah]
[2024-01-15 10:30] John: hey what are you up to this weekend?
[2024-01-15 10:32] Sarah: nothing much, was thinking of going to that new coffee place
[2024-01-15 10:32] John: oh the one on main street?
[2024-01-15 10:33] Sarah: yeah! wanna come?
[2024-01-15 10:35] John: sure, sunday morning works for me
```

---

## Core Functions

### 1. Generate Embedding (AI SDK + Gemini)

```typescript
import { embed } from "ai";
import { google } from "@ai-sdk/google";

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding("text-embedding-004"),
    value: text,
  });
  return embedding;
}
```

### 2. Chunk Messages

```typescript
interface Message {
  from: string;
  text: string;
  date: string;
}

interface MessageChunk {
  content: string;
  sender: string;  // "mixed" if multiple senders
  startTimestamp: Date;
  endTimestamp: Date;
  messageCount: number;
  chunkIndex: number;
}

export function chunkMessages(
  messages: Message[],
  chunkSize: number = 7,
  overlap: number = 2
): MessageChunk[] {
  const chunks: MessageChunk[] = [];
  const participants = [...new Set(messages.map(m => m.from))];
  const header = `[Conversation between ${participants.join(" and ")}]`;
  
  for (let i = 0; i < messages.length; i += (chunkSize - overlap)) {
    const chunkMessages = messages.slice(i, i + chunkSize);
    if (chunkMessages.length === 0) break;
    
    const senders = [...new Set(chunkMessages.map(m => m.from))];
    const content = header + "\n" + chunkMessages
      .map(m => `[${m.date}] ${m.from}: ${m.text}`)
      .join("\n");
    
    chunks.push({
      content,
      sender: senders.length === 1 ? senders[0] : "mixed",
      startTimestamp: new Date(chunkMessages[0].date),
      endTimestamp: new Date(chunkMessages[chunkMessages.length - 1].date),
      messageCount: chunkMessages.length,
      chunkIndex: chunks.length,
    });
  }
  
  return chunks;
}
```

### 3. Embed and Store Chunks

```typescript
import { db } from "@/db";
import { messageEmbeddings } from "@/db/schema";

export async function embedAndStoreMessages(
  analysisId: string,
  messages: Message[]
): Promise<void> {
  const chunks = chunkMessages(messages);
  
  // Batch embed for efficiency (if AI SDK supports it)
  // Otherwise, embed one by one with rate limiting
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
```

### 4. Similarity Search

```typescript
import { db } from "@/db";
import { messageEmbeddings } from "@/db/schema";
import { cosineDistance, desc, gt, sql, eq } from "drizzle-orm";

export async function findRelevantMessages(
  analysisId: string,
  query: string,
  limit: number = 5
): Promise<{
  content: string;
  sender: string;
  similarity: number;
  startTimestamp: Date;
}[]> {
  const queryEmbedding = await generateEmbedding(query);
  
  const similarity = sql<number>`1 - (${cosineDistance(
    messageEmbeddings.embedding,
    queryEmbedding
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
```

### 5. Build Context

```typescript
export function buildContext(
  chunks: { content: string; similarity: number }[]
): string {
  if (chunks.length === 0) return "No relevant messages found.";
  
  return chunks
    .map((chunk, i) => `[Relevant Conversation ${i + 1}]\n${chunk.content}`)
    .join("\n\n---\n\n");
}
```

---

## API Routes

### POST `/api/analysis/[id]/chat`

```typescript
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { findRelevantMessages, buildContext } from "@/lib/rag";

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
- Answer questions based on the conversation excerpts provided
- Quote specific messages when relevant
- If asked about something not in the excerpts, say "I couldn't find that in the messages I searched, but you can try asking differently"
- Be helpful in identifying patterns, finding specific moments, or summarizing parts of the conversation
- Respect the privacy and sensitivity of personal conversations`;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const { messages }: { messages: UIMessage[] } = await req.json();
    
    // Get the latest user message for RAG retrieval
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage?.parts?.find(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )?.text ?? "";
    
    // Retrieve relevant message chunks
    let context = "";
    try {
      const relevantChunks = await findRelevantMessages(analysisId, userQuery, 5);
      context = buildContext(relevantChunks);
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

---

## UI Components

### Sidebar Chat Component

Located in the Analysis Dashboard, toggleable via a button.

**Features:**
- Slide-in sidebar from the right
- Chat input at bottom
- Streaming responses
- Message history (session only, not persisted)
- Quick suggestion chips ("Find our first message", "When did we talk about...", etc.)

---

## Implementation Phases

### Phase 0: Migrate to Vercel AI SDK

Before adding RAG, we need to migrate the existing `actions/ai.ts` from `@google/generative-ai` to `@ai-sdk/google`. This gives us:
- Unified API for text generation and embeddings
- Built-in streaming support
- Better structured output handling with `generateObject`
- Consistent patterns across the codebase

#### Current Implementation (to be replaced)

```typescript
// actions/ai.ts - BEFORE
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

const generationConfig = {
  temperature: 0.2,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 5000,
};

export async function generateAIInsights(stats, sampleMessages) {
  const chatSession = model.startChat({ generationConfig });
  const result = await chatSession.sendMessage(prompt);
  const responseText = result.response.text();
  // Manual JSON parsing with fallbacks...
}
```

#### New Implementation (AI SDK)

```typescript
// actions/ai.ts - AFTER
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// Define schema for structured output
const insightsSchema = z.object({
  aiSummary: z.string(),
  relationshipHealthScore: z.object({
    overall: z.number(),
    details: z.object({
      balance: z.number(),
      engagement: z.number(),
      positivity: z.number(),
      consistency: z.number(),
    }),
    redFlags: z.array(z.string()),
  }),
  interestPercentage: z.record(z.object({
    score: z.number(),
    details: z.object({
      initiation: z.number(),
      responseRate: z.number(),
      enthusiasm: z.number(),
      consistency: z.number(),
    }),
  })),
  cookedStatus: z.object({
    isCooked: z.boolean(),
    user: z.string(),
    confidence: z.number(),
  }),
  attachmentStyles: z.record(z.object({
    user: z.string(),
    primaryStyle: z.string(),
    secondaryStyle: z.string().optional(),
    confidence: z.number(),
    details: z.object({
      secure: z.number(),
      anxious: z.number(),
      avoidant: z.number(),
      disorganized: z.number(),
    }),
    description: z.string(),
  })),
  matchPercentage: z.object({
    score: z.number(),
    compatibility: z.object({
      reasons: z.array(z.string()),
      incompatibilities: z.array(z.string()),
    }),
    confidence: z.number(),
  }),
});

export async function generateAIInsights(stats, sampleMessages) {
  try {
    const { object } = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: insightsSchema,
      prompt: `...`, // Same prompt as before
      temperature: 0.2,
      maxTokens: 5000,
    });

    return object; // Already typed and validated!
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return getDefaultAIInsights(stats);
  }
}
```

#### Phase 0 Tasks

- [ ] Install dependencies: `pnpm add ai @ai-sdk/google zod`
- [ ] Add `GOOGLE_GENERATIVE_AI_API_KEY` env var (AI SDK uses this instead of `GOOGLE_GENERATIVE_AI_API_KEY`)
- [ ] Create Zod schema for insights in `lib/schemas/insights.ts`
- [ ] Refactor `actions/ai.ts` to use `generateObject`
- [ ] Remove manual JSON parsing code (no longer needed!)
- [ ] Test insights generation still works
- [ ] Remove `@google/generative-ai` package

#### Environment Variable Change

```bash
# .env - AI SDK uses a different env var name
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here

# You can keep GOOGLE_GENERATIVE_AI_API_KEY for backwards compat and alias it:
# GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
```

---

### Phase 1: Database Setup
- [ ] Enable pgvector extension in Neon (`CREATE EXTENSION vector;`)
- [x] ~~Add `messageEmbeddings` table to Drizzle schema~~
- [ ] Generate and run migration
- [ ] Test vector operations in Drizzle Studio

### Phase 2: Embedding Pipeline
- [x] ~~Create `lib/rag/embedding.ts` with `generateEmbedding` function~~
- [x] ~~Create `lib/rag/chunking.ts` with message chunking logic~~
- [x] ~~Create `lib/rag/store.ts` with `embedAndStoreMessages` function~~
- [ ] Integrate into upload flow (after parsing, before saving stats)

### Phase 3: Retrieval System
- [x] ~~Create `lib/rag/search.ts` with `findRelevantMessages` function~~
- [x] ~~Create `lib/rag/context.ts` with `buildContext` function~~
- [ ] Test retrieval with sample queries

### Phase 4: Chat API
- [x] ~~Create `/api/analysis/[id]/chat` route~~
- [x] ~~Implement streaming with AI SDK~~
- [ ] Add authentication check (user must own the analysis)
- [ ] Test with Postman/curl

### Phase 5: UI Implementation
- [x] ~~Install shadcn/ui Sidebar component (`npx shadcn@latest add sidebar`)~~
- [x] ~~Create chat sidebar using `SidebarProvider`, `Sidebar`, `SidebarContent`, etc.~~
- [x] ~~Add toggle button to Analysis Dashboard header~~
- [x] ~~Implement `useChat` hook from AI SDK for streaming~~
- [x] ~~Style the chat interface (matches app design)~~
- [x] ~~Add suggestion chips~~
- [ ] Mobile responsive (sidebar collapses to sheet/drawer)

### Phase 6: Polish & Optimization
- [ ] Add loading states
- [ ] Handle errors gracefully
- [ ] Add embedding progress indicator during upload
- [ ] Consider batch embedding for large chats
- [ ] Add rate limiting if needed

---

## Example User Queries

The RAG chatbot should handle queries like:

- "When did we first say I love you?"
- "Find messages about our trip to Paris"
- "What were we fighting about last month?"
- "Show me the sweetest message they sent"
- "When did they apologize?"
- "Summarize our conversation from New Year's Eve"
- "How often do they initiate conversations?"
- "Find all messages where they mentioned work stress"

---

## Dependencies to Install

```bash
# Phase 0: AI SDK migration
pnpm add ai @ai-sdk/google zod

# After migration complete:
pnpm remove @google/generative-ai
```

**Why Zod?** The AI SDK's `generateObject` uses Zod schemas to:
1. Define the expected JSON structure
2. Automatically validate the LLM output
3. Provide TypeScript types for free
4. No more manual JSON parsing or repair code!

---

## Cost Considerations

### Gemini text-embedding-004
- Free tier: 1,500 requests/minute
- Paid: $0.00001 per 1,000 characters

### Storage (Neon)
- 768 dimensions × 4 bytes = ~3KB per embedding
- 1000 messages ÷ 7 per chunk = ~143 chunks = ~430KB per analysis
- Neon free tier: 512MB

### Estimate for 100 users with 10K messages each:
- Chunks: ~143K chunks total
- Storage: ~43MB (well within free tier)
- Embedding cost: Negligible

---

## Security Considerations

- [ ] Verify user owns the analysis before allowing chat
- [ ] Sanitize user input before embedding
- [ ] Rate limit chat requests per user
- [ ] Don't expose raw database errors
- [ ] Consider message retention policy

---

## Future Enhancements (Post-MVP)

- [ ] Persist chat history per analysis
- [ ] "Highlight in original chat" feature
- [ ] Export conversation with highlights
- [ ] Multi-analysis search (search across all your chats)
- [ ] Smart suggestions based on analysis stats