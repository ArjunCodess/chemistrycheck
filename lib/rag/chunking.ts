export interface Message {
  from: string;
  text: string;
  date: string;
}

export interface MessageChunk {
  content: string;
  startTimestamp: Date;
  endTimestamp: Date;
  messageCount: number;
  chunkIndex: number;
}

/**
 * Chunk messages into blocks of 5-10 messages for embedding
 * Uses sliding window with overlap to preserve context at boundaries
 */
export function chunkMessages(
  messages: Message[],
  chunkSize: number = 10,
  overlap: number = 2,
): MessageChunk[] {
  const chunks: MessageChunk[] = [];
  const participants = [...new Set(messages.map((m) => m.from))];
  const header = `[Conversation between ${participants.join(" and ")}]`;

  for (let i = 0; i < messages.length; i += chunkSize - overlap) {
    const chunkMessages = messages.slice(i, i + chunkSize);
    if (chunkMessages.length === 0) break;

    const content =
      header +
      "\n" +
      chunkMessages.map((m) => `[${m.date}] ${m.from}: ${m.text}`).join("\n");

    chunks.push({
      content,
      startTimestamp: new Date(chunkMessages[0].date),
      endTimestamp: new Date(chunkMessages[chunkMessages.length - 1].date),
      messageCount: chunkMessages.length,
      chunkIndex: chunks.length,
    });
  }

  return chunks;
}
