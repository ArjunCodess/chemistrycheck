import {
  ChatStats,
  InstagramMessage,
  InstagramChatData,
  ResponseTimeStats,
  MediaStats,
  EmojiCombination,
  EmojiStats,
  RelationshipHealthScore,
  InterestPercentage,
  CookedStatus,
  AttachmentStyle,
} from "@/types";
import { generateAIInsights } from "@/actions/ai";
import { decodeInstagramEmojis } from "../format-utils";

export async function parseChatData(data: InstagramChatData): Promise<{
  stats: ChatStats;
  messages: { from: string; text: string; date: string }[];
}> {
  console.log(
    `[instagram] Parsing started: ${data.messages?.length || 0} messages`,
  );

  // Check if valid data is provided
  if (
    !data ||
    !data.messages ||
    !Array.isArray(data.messages) ||
    data.messages.length === 0
  ) {
    console.error("[instagram] Invalid chat data format");
    return { stats: getDefaultStats(), messages: [] };
  }

  // Initialize primary stats object
  const stats = {
    source: "instagram",
    totalMessages: 0,
    messagesByUser: {} as Record<string, number>,
    totalWords: 0,
    wordsByUser: {} as Record<string, number>,
    mostUsedWords: [] as Array<{ word: string; count: number }>,
    mostUsedEmojis: [] as Array<{ emoji: string; count: number }>,
    wordFrequency: {} as Record<string, number>,
    emojiFrequency: {} as Record<string, number>,
    wordFrequencyByUser: {} as Record<string, Record<string, number>>,

    responseTimes: {} as Record<string, ResponseTimeStats>,
    mediaStats: {
      total: 0,
      byType: {
        images: 0,
        videos: 0,
        documents: 0,
        stickers: 0,
        animations: 0,
        links: 0,
        reels: 0, // Instagram specific
        stories: 0, // Instagram specific
        posts: 0, // Instagram specific
      },
      totalSize: 0,
      byUser: {} as MediaStats["byUser"],
    } as MediaStats,
    emojiStats: {
      frequency: {} as Record<string, number>,
      byUser: {} as Record<string, Record<string, number>>,
      combinations: [] as EmojiCombination[],
      sentiment: {
        positive: 0,
        negative: 0,
        neutral: 0,
      },
    } as EmojiStats,
    editedMessages: {
      total: 0,
      byUser: {} as Record<string, number>,
    },
    gapTrends: [] as Array<{ time: string; duration: number }>,
    gapAnalysis: {} as Record<
      string,
      Array<{ time: string; duration: number }>
    >,
    biggestGaps: [] as Array<{ user: string; duration: number; date: string }>,
    longestMessages: {} as Record<
      string,
      Array<{ text: string; length: number; date: string }>
    >,
    messagesByHour: {} as Record<string, number>,
    messagesByDay: {} as Record<string, number>,
    messagesByMonth: {} as Record<string, number>,
    sorryByUser: {} as Record<string, number>,
    // AI Insights fields
    aiSummary: undefined as string | undefined,
    relationshipHealthScore: undefined as RelationshipHealthScore | undefined,
    interestPercentage: {} as Record<string, InterestPercentage> | undefined,
    cookedStatus: undefined as CookedStatus | undefined,
    mostApologeticUser: undefined as
      | {
          user: string;
          apologies: number;
          percentage: number;
          mostCommonSorry: string;
        }
      | undefined,
    equalApologies: true,
    attachmentStyles: {} as Record<string, AttachmentStyle> | undefined,
  } as ChatStats;

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

  // Map to track unique months for proper ordering later
  const monthsMap = new Map<string, number>();

  // Initialize word frequency by user
  const wordFrequencyByUser: Record<string, Record<string, number>> = {};

  // Process each message
  data.messages.forEach((message) => {
    if (!message) {
      return;
    }

    // Extract user, skip if unknown
    // Decode the sender name to properly handle emojis
    const user = message.sender_name
      ? decodeInstagramEmojis(message.sender_name)
      : "unknown";
    if (!user || user === "unknown") {
      return;
    }

    // Count messages by user
    stats.messagesByUser[user] = (stats.messagesByUser[user] || 0) + 1;
    stats.totalMessages++;

    // Track message activity patterns
    if (message.timestamp_ms) {
      try {
        const messageDate = new Date(message.timestamp_ms);

        // Track by hour of day (0-23)
        const hour = messageDate.getHours();
        stats.messagesByHour[hour.toString()] =
          (stats.messagesByHour[hour.toString()] || 0) + 1;

        // Track by day of week (0-6, starting from Sunday)
        const dayOfWeek = daysOfWeek[messageDate.getDay()];
        stats.messagesByDay[dayOfWeek] =
          (stats.messagesByDay[dayOfWeek] || 0) + 1;

        // Track by month (YYYY-MM format for proper sorting)
        const year = messageDate.getFullYear();
        const month = messageDate.getMonth() + 1; // JavaScript months are 0-indexed
        const monthKey = `${year}-${month.toString().padStart(2, "0")}`;

        // Store in map for later conversion to an object with proper ordering
        monthsMap.set(monthKey, (monthsMap.get(monthKey) || 0) + 1);
      } catch (error) {
        console.error("Error processing message date:", error);
      }
    }

    // Process message content
    if (message.content) {
      // Decode content to properly handle emojis
      const decodedContent = decodeInstagramEmojis(message.content);

      // Skip system or special messages like "You shared a story."
      const isSystemMessage =
        decodedContent.includes("shared a story") ||
        decodedContent.includes("sent an attachment") ||
        decodedContent.includes("You shared") ||
        // Skip Instagram reaction messages
        decodedContent.includes("रिएक्शन") ||
        decodedContent.includes("reaction to") ||
        decodedContent.includes("reacted to") ||
        decodedContent.includes("मैसेज पर") ||
        decodedContent.includes("आपके मैसेज");

      if (!isSystemMessage) {
        // Check for sorry/apologies
        const normalizedText = decodedContent.toLowerCase().trim();
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

        // Count words with simplified logic
        const words = decodedContent.trim().split(/\s+/).filter(Boolean); // Remove empty strings

        const wordCount = words.length;

        if (wordCount > 0) {
          stats.totalWords += wordCount;

          // Track by user
          stats.wordsByUser[user] = (stats.wordsByUser[user] || 0) + wordCount;

          // Track longest messages for this user (keep top 3)
          if (!stats.longestMessages[user]) {
            stats.longestMessages[user] = [];
          }

          // Store the complete message text (not truncated)
          const messageDate = message.timestamp_ms
            ? new Date(message.timestamp_ms).toLocaleDateString()
            : "Unknown date";

          // Add this message to the user's list
          stats.longestMessages[user].push({
            text: decodedContent,
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
        }

        // Initialize user's word frequency map if it doesn't exist
        if (!wordFrequencyByUser[user]) {
          wordFrequencyByUser[user] = {};
        }

        // Count word frequency with basic cleaning
        words.forEach((word: string) => {
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

        // Process emojis with decoded content
        processEmojis(decodedContent, user, stats);
      }
    }

    // Process photos in messages
    if (
      message.photos &&
      Array.isArray(message.photos) &&
      message.photos.length > 0
    ) {
      processPhotos(message, user, stats);
    }

    // Process reactions if present
    if (message.reactions && Array.isArray(message.reactions)) {
      message.reactions.forEach((reaction) => {
        if (reaction.reaction) {
          // Decode the reaction emoji
          const emoji = decodeInstagramEmojis(reaction.reaction);
          stats.emojiFrequency[emoji] = (stats.emojiFrequency[emoji] || 0) + 1;
          stats.emojiStats.frequency[emoji] =
            (stats.emojiStats.frequency[emoji] || 0) + 1;

          // Track by reactor
          // Decode the actor name
          const reactor = reaction.actor
            ? decodeInstagramEmojis(reaction.actor)
            : "unknown";
          if (reactor !== "unknown") {
            if (!stats.emojiStats.byUser[reactor]) {
              stats.emojiStats.byUser[reactor] = {};
            }
            stats.emojiStats.byUser[reactor][emoji] =
              (stats.emojiStats.byUser[reactor][emoji] || 0) + 1;
          }
        }
      });
    }

    // Process shared media/links (Instagram specific)
    if (message.share) {
      processMediaShare(message, user, stats);
    }
  });

  // Assign the word frequency by user to the stats object
  stats.wordFrequencyByUser = wordFrequencyByUser;

  // Convert accumulated month data to record
  // Sort the months chronologically
  const sortedMonths = Array.from(monthsMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  // Format the month keys to be more human-readable (e.g., "2023-01" to "Jan 2023")
  sortedMonths.forEach(([monthKey, count]) => {
    const [year, monthNum] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);

    // Format as "Jan 2023"
    const formattedMonth = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    stats.messagesByMonth[formattedMonth] = count;
  });

  // Convert word frequency to sorted array for overall stats
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
  calculateResponsesAndGaps(data.messages, stats);

  // Calculate most apologetic user
  if (Object.keys(stats.sorryByUser).length > 0) {
    const sortedUsers = Object.entries(stats.sorryByUser).sort(
      ([, a], [, b]) => (b as number) - (a as number),
    );

    const [topUser, topCount] = sortedUsers[0];
    const totalSorries = Object.values(stats.sorryByUser).reduce(
      (sum, count) => sum + (count as number),
      0,
    );

    // Check if there's a tie for most apologies
    const isTie =
      sortedUsers.length > 1 &&
      (sortedUsers[0][1] as number) === (sortedUsers[1][1] as number);

    stats.equalApologies = isTie;

    if (!isTie) {
      stats.mostApologeticUser = {
        user: topUser,
        apologies: topCount as number,
        percentage: Math.round(((topCount as number) / totalSorries) * 100),
        mostCommonSorry: "sorry",
      };
    }
  }

  // Generate AI insights
  try {
    console.log("[instagram] Generating AI insights...");

    // Prepare sample messages
    const sampleMessages = data.messages
      .filter((m) => m.content && typeof m.content === "string")
      .slice(-50) // Get the most recent 50 messages with text
      .map((m) => ({
        from: m.sender_name ? decodeInstagramEmojis(m.sender_name) : "Unknown",
        text: m.content ? decodeInstagramEmojis(m.content) : "", // Ensure text is always a string
        date: m.timestamp_ms
          ? new Date(m.timestamp_ms).toISOString()
          : new Date().toISOString(), // Ensure date is always a string
      }));

    const aiInsights = await generateAIInsights(stats, sampleMessages);

    // Add AI insights to the stats object
    stats.aiSummary = aiInsights.aiSummary;
    stats.relationshipHealthScore = aiInsights.relationshipHealthScore;
    stats.interestPercentage = aiInsights.interestPercentage;
    stats.cookedStatus = aiInsights.cookedStatus;
    stats.attachmentStyles = aiInsights.attachmentStyles;
    stats.matchPercentage = aiInsights.matchPercentage;

    console.log("[instagram] AI insights generated successfully");
  } catch (error) {
    console.error("[instagram] Error generating AI insights:", error);
  }

  // Prepare messages for RAG embedding
  const normalizedMessages = data.messages
    .filter((m) => m.content && !isSystemMessage(m))
    .map((m) => ({
      from: m.sender_name ? decodeInstagramEmojis(m.sender_name) : "Unknown",
      text: m.content ? decodeInstagramEmojis(m.content) : "",
      date: m.timestamp_ms
        ? new Date(m.timestamp_ms).toISOString()
        : new Date().toISOString(),
    }));

  const participantCount = Object.keys(stats.messagesByUser).length;
  console.log(
    `[instagram] Parsing complete: ${stats.totalMessages} messages, ${stats.totalWords} words, ${participantCount} participants`,
  );

  return { stats, messages: normalizedMessages };
}

function isSystemMessage(message: InstagramMessage): boolean {
  if (!message.content) return false;
  const content = decodeInstagramEmojis(message.content);
  return (
    content.includes("shared a story") ||
    content.includes("sent an attachment") ||
    content.includes("You shared") ||
    content.includes("रिएक्शन") ||
    content.includes("reaction to") ||
    content.includes("reacted to") ||
    content.includes("मैसेज पर") ||
    content.includes("आपके मैसेज")
  );
}

/**
 * Process photos in Instagram messages
 */
function processPhotos(
  message: InstagramMessage,
  user: string,
  stats: ChatStats,
): void {
  // Initialize user media stats if needed
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
        reels: 0,
        stories: 0,
        posts: 0,
      },
      totalSize: 0,
    };
  }

  // Count each photo
  const photoCount = message.photos?.length || 0;

  stats.mediaStats.total += photoCount;
  stats.mediaStats.byUser[user].total += photoCount;

  // Update image count
  stats.mediaStats.byType.images += photoCount;
  stats.mediaStats.byUser[user].byType.images += photoCount;
}

/**
 * Processes emojis in message content
 */
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

/**
 * Process Instagram-specific shared media items
 */
function processMediaShare(
  message: InstagramMessage,
  user: string,
  stats: ChatStats,
): void {
  // Initialize user media stats if needed
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
        reels: 0,
        stories: 0,
        posts: 0,
      },
      totalSize: 0,
    };
  }

  stats.mediaStats.total++;
  stats.mediaStats.byUser[user].total++;

  // Check link content to determine the type of media
  if (message.share?.link) {
    const link = message.share.link;

    if (link.includes("/stories/")) {
      // Shared Instagram story
      if (stats.mediaStats.byType.stories !== undefined) {
        stats.mediaStats.byType.stories++;
      } else {
        // Initialize if undefined
        stats.mediaStats.byType.stories = 1;
      }

      if (stats.mediaStats.byUser[user].byType.stories !== undefined) {
        stats.mediaStats.byUser[user].byType.stories++;
      } else {
        // Initialize if undefined
        stats.mediaStats.byUser[user].byType.stories = 1;
      }
    } else if (link.includes("/reel/")) {
      // Shared Instagram reel
      if (stats.mediaStats.byType.reels !== undefined) {
        stats.mediaStats.byType.reels++;
      } else {
        // Initialize if undefined
        stats.mediaStats.byType.reels = 1;
      }

      if (stats.mediaStats.byUser[user].byType.reels !== undefined) {
        stats.mediaStats.byUser[user].byType.reels++;
      } else {
        // Initialize if undefined
        stats.mediaStats.byUser[user].byType.reels = 1;
      }
    } else if (link.includes("/p/")) {
      // Shared Instagram post
      if (stats.mediaStats.byType.posts !== undefined) {
        stats.mediaStats.byType.posts++;
      } else {
        // Initialize if undefined
        stats.mediaStats.byType.posts = 1;
      }

      if (stats.mediaStats.byUser[user].byType.posts !== undefined) {
        stats.mediaStats.byUser[user].byType.posts++;
      } else {
        // Initialize if undefined
        stats.mediaStats.byUser[user].byType.posts = 1;
      }
    } else {
      // Generic link
      stats.mediaStats.byType.links++;
      stats.mediaStats.byUser[user].byType.links++;
    }
  } else {
    // Generic attachment
    stats.mediaStats.byType.documents++;
    stats.mediaStats.byUser[user].byType.documents++;
  }
}

/**
 * Calculate response statistics and gap analysis
 */
function calculateResponsesAndGaps(
  messages: InstagramMessage[],
  stats: ChatStats,
): void {
  // Skip if no messages
  if (!messages || messages.length === 0) {
    return;
  }

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

  // Sort messages chronologically
  const sortedMessages = [...messages].sort((a, b) => {
    if (!a.timestamp_ms || !b.timestamp_ms) return 0;
    return a.timestamp_ms - b.timestamp_ms;
  });

  // Process messages to calculate response times
  for (let i = 1; i < sortedMessages.length; i++) {
    const prevMsg = sortedMessages[i - 1];
    const currMsg = sortedMessages[i];

    // Skip if either message is missing required data
    if (
      !prevMsg.sender_name ||
      !currMsg.sender_name ||
      !prevMsg.timestamp_ms ||
      !currMsg.timestamp_ms
    ) {
      continue;
    }

    // Decode sender names for consistent comparison
    const prevUser = decodeInstagramEmojis(prevMsg.sender_name);
    const currUser = decodeInstagramEmojis(currMsg.sender_name);

    // Skip if same user
    if (prevUser === currUser) {
      continue;
    }

    // Calculate the gap in minutes
    const prevDate = new Date(prevMsg.timestamp_ms);
    const currDate = new Date(currMsg.timestamp_ms);
    const diffInMs = currDate.getTime() - prevDate.getTime();
    const diffInMin = diffInMs / (1000 * 60);

    // Skip if unreasonable gap (24 hours or more) - likely not a direct response
    if (diffInMin > 24 * 60) {
      continue;
    }

    // Ensure this user exists in our tracking
    if (!userResponseTimes[currUser]) continue;

    // Record the response time
    userResponseTimes[currUser].push(diffInMin);

    // Add to gap analysis data
    const timeStr = currDate.toISOString().split("T")[0]; // YYYY-MM-DD
    userGapTimes[currUser].push({ time: timeStr, duration: diffInMin });
    allGapTimes.push({ time: timeStr, duration: diffInMin });

    // Categorize response time
    if (diffInMin <= 5) {
      stats.responseTimes[currUser].distribution["0-5min"]++;
    } else if (diffInMin <= 15) {
      stats.responseTimes[currUser].distribution["5-15min"]++;
    } else if (diffInMin <= 30) {
      stats.responseTimes[currUser].distribution["15-30min"]++;
    } else if (diffInMin <= 60) {
      stats.responseTimes[currUser].distribution["30min-1hour"]++;
    } else {
      stats.responseTimes[currUser].distribution["1hour+"]++;
    }

    // Track biggest gaps
    if (
      biggestGaps.length < 10 ||
      diffInMin > biggestGaps[biggestGaps.length - 1].duration
    ) {
      const gapRecord = {
        user: currUser,
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
      // Calculate average
      stats.responseTimes[user].average =
        times.reduce((sum, time) => sum + time, 0) / times.length;

      // Find longest
      stats.responseTimes[user].longest = Math.max(...times);
    }
  });

  // Assign gap analysis data to stats
  stats.gapTrends = allGapTimes;
  stats.gapAnalysis = userGapTimes;
  stats.biggestGaps = biggestGaps;
}

/**
 * Returns default empty stats for error cases
 */
function getDefaultStats(): ChatStats {
  return {
    source: "instagram",
    totalMessages: 0,
    messagesByUser: {},
    totalWords: 0,
    wordsByUser: {},
    mostUsedWords: [],
    mostUsedEmojis: [],
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
        reels: 0,
        stories: 0,
        posts: 0,
      },
      totalSize: 0,
      byUser: {},
    },
    emojiStats: {
      frequency: {},
      byUser: {},
      combinations: [],
      sentiment: { positive: 0, negative: 0, neutral: 0 },
    },
    editedMessages: { total: 0, byUser: {} },
    gapTrends: [],
    gapAnalysis: {},
    biggestGaps: [],
    wordFrequency: {},
    emojiFrequency: {},
    wordFrequencyByUser: {},
    longestMessages: {},
    messagesByHour: {},
    messagesByDay: {},
    messagesByMonth: {},
    sorryByUser: {},
    equalApologies: true,
    aiSummary: "No data available for AI analysis.",
    relationshipHealthScore: {
      overall: 0,
      details: {
        balance: 0,
        engagement: 0,
        positivity: 0,
        consistency: 0,
      },
      redFlags: ["No data provided"],
    },
    interestPercentage: {},
    cookedStatus: {
      isCooked: false,
      user: "Unknown",
      confidence: 0,
    },
    attachmentStyles: {},
  };
}
