import { WhatsAppMessage, ChatStats } from "@/types";
import { generateAIInsights } from "@/actions/ai";

export async function parseChatData(rawText: string): Promise<{
  stats: ChatStats;
  messages: { from: string; text: string; date: string }[];
}> {
  const stats: ChatStats = {
    source: "whatsapp",
    totalMessages: 0,
    messagesByUser: {},
    totalWords: 0,
    wordsByUser: {},
    mostUsedWords: [],
    mostUsedEmojis: [],
    wordFrequency: {},
    emojiFrequency: {},
    wordFrequencyByUser: {},
    responseTimes: {},
    mediaStats: {
      total: 0,
      byType: {
        images: 0,
        videos: 0,
        documents: 0,
        stickers: 0,
        animations: 0,
        links: 0,
      },
      totalSize: 0,
      byUser: {},
    },
    emojiStats: {
      frequency: {},
      byUser: {},
      combinations: [],
      sentiment: {
        positive: 0,
        negative: 0,
        neutral: 0,
      },
    },
    editedMessages: {
      total: 0,
      byUser: {},
    },
    gapTrends: [],
    gapAnalysis: {},
    biggestGaps: [],
    longestMessages: {},
    messagesByHour: {},
    messagesByDay: {},
    messagesByMonth: {},
    sorryByUser: {},
    // AI Insights fields
    aiSummary: undefined,
    relationshipHealthScore: undefined,
    interestPercentage: undefined,
    cookedStatus: undefined,
    mostApologeticUser: undefined,
    equalApologies: true,
    attachmentStyles: undefined,
    matchPercentage: undefined,
  };

  console.log("[whatsapp] Parsing started");

  try {
    if (!rawText || typeof rawText !== "string") {
      console.error("[whatsapp] Invalid data format - expected a string");
      return { stats, messages: [] };
    }

    // Parse raw text into messages
    const messages = parseWhatsAppText(rawText);
    // Filter out system messages from statistical analysis
    const userMessages = messages.filter((message) => !message.isSystemMessage);

    // Initialize time-based pattern tracking
    // Initialize hours (0-23)
    for (let hour = 0; hour < 24; hour++) {
      stats.messagesByHour[hour.toString()] = 0;
    }

    // Initialize days of week
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    daysOfWeek.forEach((day) => {
      stats.messagesByDay[day] = 0;
    });

    // Map to track months (just month name, regardless of year)
    const monthsMap = new Map<string, number>();

    // Store user word frequencies
    const wordFrequencyByUser: Record<string, Record<string, number>> = {};

    // Process each message - now use userMessages instead of all messages
    let skippedCount = 0;
    userMessages.forEach((message) => {
      if (!message.sender) {
        skippedCount++;
        return;
      }

      // Count messages by user
      const user = message.sender;
      stats.messagesByUser[user] = (stats.messagesByUser[user] || 0) + 1;
      stats.totalMessages++;

      // Initialize word frequency map for user if needed
      if (!wordFrequencyByUser[user]) {
        wordFrequencyByUser[user] = {};
      }

      // Track message activity patterns
      if (message.date) {
        try {
          const messageDate = new Date(message.date);

          // Track by hour of day (0-23)
          const hour = messageDate.getHours();
          stats.messagesByHour[hour.toString()] =
            (stats.messagesByHour[hour.toString()] || 0) + 1;

          // Track by day of week (0-6, starting from Sunday)
          const dayOfWeek = daysOfWeek[messageDate.getDay()];
          stats.messagesByDay[dayOfWeek] =
            (stats.messagesByDay[dayOfWeek] || 0) + 1;

          // Track by month name only (without the year)
          const monthName = messageDate.toLocaleDateString("en-US", {
            month: "long",
          });
          monthsMap.set(monthName, (monthsMap.get(monthName) || 0) + 1);
        } catch {
          // Skip invalid dates silently
        }
      }

      // Process message content if available
      if (message.content) {
        // Skip system messages or detect if this is a special message
        if (message.content.includes("Media omitted")) {
          // Track media message
          processMediaMessage(message, stats);
          return;
        }

        // Check if message is edited
        const isEdited =
          message.isEdited ||
          message.content.includes("<This message was edited>");
        if (isEdited) {
          stats.editedMessages.total++;
          stats.editedMessages.byUser[user] =
            (stats.editedMessages.byUser[user] || 0) + 1;
        }

        // Check if message is deleted
        if (
          message.isDeleted ||
          message.content.includes("This message was deleted")
        ) {
          return; // Skip further processing for deleted messages
        }

        // Count words
        const words = message.content.trim().split(/\s+/).filter(Boolean); // Remove empty strings

        const wordCount = words.length;

        if (wordCount > 0) {
          stats.totalWords += wordCount;

          // Track by user
          stats.wordsByUser[user] = (stats.wordsByUser[user] || 0) + wordCount;

          // Store the complete message text for longest messages
          if (!stats.longestMessages[user]) {
            stats.longestMessages[user] = [];
          }

          const messageDate = message.date
            ? new Date(message.date).toLocaleDateString()
            : "Unknown date";

          // Add this message to the user's list
          stats.longestMessages[user].push({
            text: message.content,
            length: wordCount,
            date: messageDate,
          });

          // Sort messages by length (descending) and keep only top 3
          stats.longestMessages[user].sort((a, b) => b.length - a.length);
          if (stats.longestMessages[user].length > 3) {
            stats.longestMessages[user] = stats.longestMessages[user].slice(
              0,
              3,
            );
          }

          // Count word frequency
          words.forEach((word) => {
            const cleanWord = word.toLowerCase().replace(/[^\w\s]/g, "");
            if (cleanWord && cleanWord.length > 0) {
              // Track global word frequency
              stats.wordFrequency[cleanWord] =
                (stats.wordFrequency[cleanWord] || 0) + 1;

              // Track word frequency by user
              wordFrequencyByUser[user][cleanWord] =
                (wordFrequencyByUser[user][cleanWord] || 0) + 1;
            }
          });
        }

        // Check for sorry/apologies
        const normalizedText = message.content.toLowerCase().trim();

        // Filter out special WhatsApp messages before checking for apologies
        const isSpecialMessage =
          normalizedText === "this message was deleted" ||
          normalizedText === "you deleted this message" ||
          normalizedText.includes("<this message was edited>") ||
          normalizedText === "<media omitted>" ||
          normalizedText.includes("media omitted");

        if (!isSpecialMessage) {
          if (
            normalizedText.includes("sorry") ||
            normalizedText.includes("apolog") ||
            normalizedText.includes("regret") ||
            normalizedText.includes("forgive") ||
            normalizedText.includes("my bad") ||
            normalizedText.includes("my fault")
          ) {
            stats.sorryByUser[user] = (stats.sorryByUser[user] || 0) + 1;
          }

          // Process emojis
          processEmojis(message.content, user, stats);

          // Process links
          if (
            message.content.includes("http://") ||
            message.content.includes("https://")
          ) {
            if (!stats.mediaStats.byUser[user]) {
              stats.mediaStats.byUser[user] = {
                total: 0,
                byType: {
                  images: 0,
                  videos: 0,
                  documents: 0,
                  stickers: 0,
                  animations: 0,
                  links: 0,
                },
                totalSize: 0,
              };
            }

            stats.mediaStats.total++;
            stats.mediaStats.byType.links++;
            stats.mediaStats.byUser[user].total++;
            stats.mediaStats.byUser[user].byType.links++;
          }
        }
      }
    });

    // Convert month data to record - sort by natural month order
    const monthOrder = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Add months in natural order
    monthOrder.forEach((month) => {
      const count = monthsMap.get(month) || 0;
      if (count > 0) {
        stats.messagesByMonth[month] = count;
      }
    });

    // Assign word frequency by user to stats
    stats.wordFrequencyByUser = wordFrequencyByUser;

    // Convert word frequency to sorted array
    stats.mostUsedWords = Object.entries(stats.wordFrequency)
      .filter(([word]) => word.length > 2) // Filter out short words
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Convert emoji frequency to sorted array
    stats.mostUsedEmojis = Object.entries(stats.emojiFrequency)
      .filter(([emoji]) => {
        // Additional filtering to remove any remaining numbers or basic characters
        return (
          !/^\d$/.test(emoji) &&
          !/^[a-zA-Z]$/.test(emoji) &&
          !/^[.,!?;:\-_'"()[\]{}]$/.test(emoji)
        );
      })
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate response statistics and gap analysis
    calculateResponsesAndGaps(userMessages, stats);

    // Add AI insights
    try {
      console.log("[whatsapp] Generating AI insights...");

      // Prepare sample messages for AI analysis
      const sampleMessages = userMessages
        .filter(
          (m) =>
            m.content &&
            !m.isSystemMessage &&
            // Filter out special message types
            !m.content.includes("Media omitted") &&
            !m.content.includes("<This message was edited>") &&
            m.content !== "This message was deleted" &&
            m.content !== "You deleted this message" &&
            !m.content.includes("http://") &&
            !m.content.includes("https://") &&
            m.content !== "null",
        ) // Filter out messages with just 'null'
        .slice(-50) // Get the most recent 50 messages
        .map((m) => ({
          from: m.sender,
          text: m.content,
          date: m.date || "",
        }));

      // Call the AI insights generator from actions/ai.ts
      const aiInsights = await generateAIInsights(stats, sampleMessages);

      // Add AI insights to the stats object
      stats.aiSummary = aiInsights.aiSummary;
      stats.relationshipHealthScore = aiInsights.relationshipHealthScore;
      stats.interestPercentage = aiInsights.interestPercentage;
      stats.cookedStatus = aiInsights.cookedStatus;
      stats.attachmentStyles = aiInsights.attachmentStyles;
      stats.matchPercentage = aiInsights.matchPercentage;

      console.log("[whatsapp] AI insights generated successfully");
    } catch (error) {
      console.error("[whatsapp] Error generating AI insights:", error);
    }

    // Prepare messages for RAG embedding
    const normalizedMessages = userMessages
      .filter((m) => m.content && !m.isSystemMessage)
      .map((m) => ({
        from: m.sender || "Unknown",
        text: m.content || "",
        date: m.date || new Date().toISOString(),
      }));

    const participantCount = Object.keys(stats.messagesByUser).length;
    console.log(
      `[whatsapp] Parsing complete: ${stats.totalMessages} messages, ${stats.totalWords} words, ${participantCount} participants${skippedCount > 0 ? `, ${skippedCount} skipped` : ""}`,
    );

    return { stats, messages: normalizedMessages };
  } catch (error) {
    console.error("[whatsapp] Error parsing chat data:", error);
    return { stats, messages: [] };
  }
}

// Helper function to parse WhatsApp text export into structured messages
function parseWhatsAppText(text: string): WhatsAppMessage[] {
  const lines = text.split("\n");
  const messages: WhatsAppMessage[] = [];
  let currentMessage: WhatsAppMessage | null = null;

  // More flexible regex patterns to handle various WhatsApp export formats
  // Format 1: "26/11/24, 9:54 pm - arjuncodess: prinout nikava de."
  // Format 2: "26/11/24, 9:54 - arjuncodess: prinout nikava de." (no am/pm)
  // Format 3: "11/26/2024, 21:54 - arjuncodess: prinout nikava de." (24-hour format)
  const messageRegex =
    /^(\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4})),\s(\d{1,2}:\d{1,2}(?:\s?[ap]m)?)\s-\s([^:]+):\s(.*)$/i;

  // System message regex (also more flexible)
  const systemMessageRegex =
    /^(\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4})),\s(\d{1,2}:\d{1,2}(?:\s?[ap]m)?)\s-\s(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Try to match standard message format
      const messageMatch = line.match(messageRegex);
      if (messageMatch) {
        // If we have a current message in progress, save it
        if (currentMessage) {
          messages.push(currentMessage);
        }

        // Extract date components
        const datePart = messageMatch[1]; // e.g., "26/11/24"
        const timePart = messageMatch[2]; // e.g., "9:54 pm"

        // Parse date first
        let day, month, year;

        if (datePart.includes("/")) {
          const datePieces = datePart.split("/");

          // Handle DD/MM/YYYY format as specified by user
          if (datePieces.length === 3) {
            // Always use DD/MM/YYYY format
            day = datePieces[0];
            month = datePieces[1];
            year = datePieces[2];

            // Ensure year is 4 digits
            if (year.length === 2) {
              year = "20" + year; // Assuming all dates are from 2000s or later
            }
          } else {
            // Invalid date format, use current date as fallback
            const now = new Date();
            day = now.getDate().toString();
            month = (now.getMonth() + 1).toString();
            year = now.getFullYear().toString();
            console.warn(
              `Invalid date format: ${datePart}, using current date as fallback`,
            );
          }
        } else {
          // Invalid date format, use current date as fallback
          const now = new Date();
          day = now.getDate().toString();
          month = (now.getMonth() + 1).toString();
          year = now.getFullYear().toString();
          console.warn(
            `Invalid date format: ${datePart}, using current date as fallback`,
          );
        }

        // Process time part with better detection for 24h or 12h format
        let hour = 0;
        let minute = 0;

        if (timePart) {
          // Check if time is in 12h or 24h format
          const has12HourFormat = /am|pm/i.test(timePart);

          if (has12HourFormat) {
            // 12-hour format "9:54 pm"
            const [hourMinute, ampm] = timePart.split(/\s+/);
            if (hourMinute && hourMinute.includes(":")) {
              const [hourStr, minuteStr] = hourMinute.split(":");
              hour = parseInt(hourStr, 10) || 0;
              minute = parseInt(minuteStr, 10) || 0;

              // Convert to 24-hour format
              if (ampm && ampm.toLowerCase() === "pm" && hour < 12) {
                hour += 12;
              } else if (ampm && ampm.toLowerCase() === "am" && hour === 12) {
                hour = 0;
              }
            }
          } else {
            // 24-hour format "21:54"
            if (timePart.includes(":")) {
              const [hourStr, minuteStr] = timePart.split(":");
              hour = parseInt(hourStr, 10) || 0;
              minute = parseInt(minuteStr, 10) || 0;
            }
          }
        }

        // Ensure values are within valid ranges
        hour = Math.min(Math.max(hour, 0), 23);
        minute = Math.min(Math.max(minute, 0), 59);

        // Construct ISO date string
        const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;

        // Create new message
        const messageContent = messageMatch[4];
        const isEditedMessage = messageContent.includes(
          "<This message was edited>",
        );
        const isDeletedMessage = messageContent.includes(
          "This message was deleted",
        );

        currentMessage = {
          date: isoDate,
          sender: messageMatch[3].trim(),
          content: messageContent,
          isEdited: isEditedMessage,
          isDeleted: isDeletedMessage,
        };

        // Check for media messages
        if (
          currentMessage.content.includes("<Media omitted>") ||
          currentMessage.content.includes("Media omitted")
        ) {
          currentMessage.mediaType = "unknown";
        }

        // Continue to next line
        continue;
      }

      // Try to match system message
      const systemMatch = line.match(systemMessageRegex);
      if (systemMatch) {
        // Process system message (group notifications, etc.) similar to above
        // but simplified since we don't need full content parsing
        const datePart = systemMatch[1];
        const timePart = systemMatch[2];

        // Parse date
        let day, month, year;
        if (datePart.includes("/")) {
          const datePieces = datePart.split("/");
          if (datePieces.length === 3) {
            // Always use DD/MM/YYYY format
            day = datePieces[0];
            month = datePieces[1];
            year = datePieces[2];

            if (year.length === 2) {
              year = "20" + year;
            }
          } else {
            const now = new Date();
            day = now.getDate().toString();
            month = (now.getMonth() + 1).toString();
            year = now.getFullYear().toString();
          }
        } else {
          const now = new Date();
          day = now.getDate().toString();
          month = (now.getMonth() + 1).toString();
          year = now.getFullYear().toString();
        }

        // Process time
        let hour = 0;
        let minute = 0;

        if (timePart) {
          const has12HourFormat = /am|pm/i.test(timePart);

          if (has12HourFormat) {
            const parts = timePart.split(/\s+/);
            const hourMinute = parts[0];
            const ampm = parts.length > 1 ? parts[1] : null;

            if (hourMinute && hourMinute.includes(":")) {
              const [hourStr, minuteStr] = hourMinute.split(":");
              hour = parseInt(hourStr, 10) || 0;
              minute = parseInt(minuteStr, 10) || 0;

              if (ampm && ampm.toLowerCase() === "pm" && hour < 12) {
                hour += 12;
              } else if (ampm && ampm.toLowerCase() === "am" && hour === 12) {
                hour = 0;
              }
            }
          } else {
            if (timePart.includes(":")) {
              const [hourStr, minuteStr] = timePart.split(":");
              hour = parseInt(hourStr, 10) || 0;
              minute = parseInt(minuteStr, 10) || 0;
            }
          }
        }

        hour = Math.min(Math.max(hour, 0), 23);
        minute = Math.min(Math.max(minute, 0), 59);

        const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;

        // Create system message but don't mark it explicitly as "System" sender
        const systemMessage: WhatsAppMessage = {
          date: isoDate,
          sender: "", // Empty sender instead of 'System'
          content: systemMatch[3],
          isSystemMessage: true, // Flag it as system message for reference
        };

        messages.push(systemMessage);
        currentMessage = null;
        continue;
      }

      // If neither regex matched, it might be a continuation of the previous message
      if (currentMessage) {
        currentMessage.content += "\n" + line;
      }
    } catch {
      // Skip unparseable lines silently
      // Continue processing other messages
      continue;
    }
  }

  // Add the last message if exists
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

// Helper function to process media messages - simplified for WhatsApp
function processMediaMessage(message: WhatsAppMessage, stats: ChatStats): void {
  const user = message.sender;

  // Initialize media stats for user if needed
  if (!stats.mediaStats.byUser[user]) {
    stats.mediaStats.byUser[user] = {
      total: 0,
      byType: {
        images: 0,
        videos: 0,
        documents: 0, // We'll use this for all media in WhatsApp (as "Other Media" in UI)
        stickers: 0,
        animations: 0,
        links: 0,
      },
      totalSize: 0, // Not used for WhatsApp
    };
  }

  // Update media stats - combine all media as "documents" (will be "Other Media" in UI)
  stats.mediaStats.total++;
  stats.mediaStats.byUser[user].total++;

  // For WhatsApp, we count all media as "documents" (will be "Other Media" in UI)
  stats.mediaStats.byType.documents++;
  stats.mediaStats.byUser[user].byType.documents++;

  // Zero out other media types to ensure they aren't used in the UI
  stats.mediaStats.byType.images = 0;
  stats.mediaStats.byType.videos = 0;
  stats.mediaStats.byType.stickers = 0;
  stats.mediaStats.byType.animations = 0;
}

// Helper function to process emojis in message content
function processEmojis(content: string, user: string, stats: ChatStats): void {
  try {
    // Emoji regex pattern
    const emojiRegex =
      /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

    const emojis = content.match(emojiRegex);

    if (emojis && emojis.length > 0) {
      emojis.forEach((emoji) => {
        // Skip if emoji is actually a number or basic punctuation
        if (/^\d$/.test(emoji) || /^[.,!?;:\-_'"()[\]{}]$/.test(emoji)) {
          return;
        }

        // Update global emoji frequency
        stats.emojiFrequency[emoji] = (stats.emojiFrequency[emoji] || 0) + 1;

        // Initialize user's emoji stats if needed
        if (!stats.emojiStats.byUser[user]) {
          stats.emojiStats.byUser[user] = {};
        }

        // Update user-specific emoji frequency
        stats.emojiStats.frequency[emoji] =
          (stats.emojiStats.frequency[emoji] || 0) + 1;
        stats.emojiStats.byUser[user][emoji] =
          (stats.emojiStats.byUser[user][emoji] || 0) + 1;
      });
    }
  } catch {
    // Skip emoji processing errors silently
  }
}

// Helper function to calculate response statistics and gap analysis
function calculateResponsesAndGaps(
  messages: WhatsAppMessage[],
  stats: ChatStats,
): void {
  const userResponseTimes: Record<string, number[]> = {};
  const userGapTimes: Record<
    string,
    Array<{ time: string; duration: number }>
  > = {};
  const allGapTimes: Array<{ time: string; duration: number }> = [];
  const biggestGaps: Array<{ user: string; duration: number; date: string }> =
    [];

  // Initialize response time stats for each user
  Object.keys(stats.messagesByUser).forEach((user) => {
    stats.responseTimes[user] = {
      average: 0,
      longest: 0,
      distribution: {
        "0-5min": 0,
        "5-15min": 0,
        "15-30min": 0,
        "30min-1hour": 0,
        "1hour+": 0,
      },
    };
    userResponseTimes[user] = [];
    userGapTimes[user] = [];
  });

  // First, validate all date strings and sort messages by date
  const validMessages = messages.filter((msg) => {
    if (!msg.date) return false;

    // Validate date to ensure it's parseable
    try {
      const date = new Date(msg.date);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  });

  // Sort messages chronologically
  const sortedMessages = [...validMessages].sort((a, b) => {
    const dateA = new Date(a.date!);
    const dateB = new Date(b.date!);
    return dateA.getTime() - dateB.getTime();
  });

  // Process messages to calculate response times
  for (let i = 1; i < sortedMessages.length; i++) {
    const prevMsg = sortedMessages[i - 1];
    const currMsg = sortedMessages[i];

    // Skip if either message is missing required data
    if (
      !prevMsg.sender ||
      !currMsg.sender ||
      prevMsg.sender === currMsg.sender
    ) {
      continue;
    }

    // Calculate the gap in minutes
    const prevDate = new Date(prevMsg.date!);
    const currDate = new Date(currMsg.date!);
    const diffInMs = currDate.getTime() - prevDate.getTime();

    // Ensure we're always getting a positive value
    const diffInMin = Math.max(0, diffInMs) / (1000 * 60);

    // Skip if unreasonable gap (24 hours or more) - likely not a direct response
    if (diffInMin > 24 * 60) {
      continue;
    }

    const user = currMsg.sender;
    if (!userResponseTimes[user]) continue;

    // Record the response time
    userResponseTimes[user].push(diffInMin);

    // Add to gap analysis data
    const timeStr = currDate.toISOString().split("T")[0]; // YYYY-MM-DD
    userGapTimes[user].push({ time: timeStr, duration: diffInMin });
    allGapTimes.push({ time: timeStr, duration: diffInMin });

    // Categorize response time
    if (diffInMin <= 5) {
      stats.responseTimes[user].distribution["0-5min"]++;
    } else if (diffInMin <= 15) {
      stats.responseTimes[user].distribution["5-15min"]++;
    } else if (diffInMin <= 30) {
      stats.responseTimes[user].distribution["15-30min"]++;
    } else if (diffInMin <= 60) {
      stats.responseTimes[user].distribution["30min-1hour"]++;
    } else {
      stats.responseTimes[user].distribution["1hour+"]++;
    }

    // Track biggest gaps
    if (
      biggestGaps.length < 10 ||
      diffInMin > biggestGaps[biggestGaps.length - 1].duration
    ) {
      const gapRecord = {
        user,
        duration: diffInMin,
        date: currDate.toISOString(),
      };

      // Insert into sorted array
      biggestGaps.push(gapRecord);
      biggestGaps.sort((a, b) => b.duration - a.duration);

      // Keep only top 10
      if (biggestGaps.length > 10) {
        biggestGaps.pop();
      }
    }
  }

  // Calculate average and longest response times
  Object.keys(userResponseTimes).forEach((user) => {
    const times = userResponseTimes[user];
    if (times.length > 0) {
      const sum = times.reduce((sum, time) => sum + time, 0);
      const avg = sum / times.length;

      stats.responseTimes[user].average = avg;

      // Find longest
      stats.responseTimes[user].longest = Math.max(...times);
    }
  });

  // Assign gap analysis data to stats
  stats.gapTrends = allGapTimes;
  stats.gapAnalysis = userGapTimes;
  stats.biggestGaps = biggestGaps;

  // Process apologies data
  const users = Object.keys(stats.sorryByUser);

  // Check if we have exactly two users
  if (users.length === 2) {
    const sorryCount1 = stats.sorryByUser[users[0]] || 0;
    const sorryCount2 = stats.sorryByUser[users[1]] || 0;

    // Check if apologies are equal
    stats.equalApologies = sorryCount1 === sorryCount2 && sorryCount1 > 0;

    if (!stats.equalApologies && (sorryCount1 > 0 || sorryCount2 > 0)) {
      // Determine who apologizes more
      const mostApologeticUser =
        sorryCount1 > sorryCount2 ? users[0] : users[1];
      const apologies = Math.max(sorryCount1, sorryCount2);
      const totalApologies = sorryCount1 + sorryCount2;
      const percentage = Math.round((apologies / totalApologies) * 100);

      // Set mostApologeticUser with extended info
      stats.mostApologeticUser = {
        user: mostApologeticUser,
        apologies: apologies,
        percentage: percentage,
        mostCommonSorry: "Sorry", // Default value, we could analyze this further
      };
    }
  } else if (users.length === 1 && stats.sorryByUser[users[0]] > 0) {
    // Only one user apologizes
    stats.mostApologeticUser = {
      user: users[0],
      apologies: stats.sorryByUser[users[0]],
      percentage: 100,
      mostCommonSorry: "Sorry", // Default value
    };
  }

  // If equal apologies, ensure mostApologeticUser is null
  if (stats.equalApologies) {
    stats.mostApologeticUser = undefined;
  }
}
