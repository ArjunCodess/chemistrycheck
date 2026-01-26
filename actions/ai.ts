import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ChatStats,
  RelationshipHealthScore,
  InterestPercentage,
  CookedStatus,
  AttachmentStyle,
  MatchPercentage,
} from "@/types";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
);

const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
});

const generationConfig = {
  temperature: 0.2,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 5000,
};

export async function generateAIInsights(
  stats: ChatStats,
  sampleMessages: Array<{ from: string; text: string; date: string }>,
) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error(
        "GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables",
      );
      return getDefaultAIInsights(stats);
    }

    const chatSummary = {
      totalMessages: stats.totalMessages,
      messagesByUser: stats.messagesByUser,
      totalWords: stats.totalWords,
      wordsByUser: stats.wordsByUser,
      mostUsedWords: stats.mostUsedWords?.slice(0, 10),
      mostUsedEmojis: stats.mostUsedEmojis?.slice(0, 10),
      responseTimes: stats.responseTimes,
      biggestGaps: stats.biggestGaps?.slice(0, 5),
      longestMessages: stats.longestMessages,
      messagesByHour: stats.messagesByHour,
      messagesByDay: stats.messagesByDay,
      messagesByMonth: stats.messagesByMonth,
      sorryByUser: stats.sorryByUser,
    };

    const prompt = `
      Write like a real human. Be professional, but natural, like you're explaining something to a smart friend over coffee. Avoid buzzwords, corporate jargon, and em dashes. Never sound like a press release. Be clear, direct, conversational and real.
      
      You are an expert in analyzing chat conversations. Based on the provided chat statistics and sample messages, please generate:
      
      1. A 3-4 paragraph chat summary that describes the overall relationship dynamics, communication patterns, and whether there are any signs that one person is "cooked" (showing significantly more interest than the other).
      
      2. A relationship health score from 0-100 with detailed subscores for:
         - Balance (equal participation): 0-100
         - Engagement (active participation): 0-100
         - Positivity (positive sentiment): 0-100
         - Consistency (regular communication): 0-100
      
      3. List of potential red flags in the relationship (if any)
      
      4. Interest percentage for each participant on a scale of 0-100, with subscores for:
         - Initiation (who starts conversations): 0-100
         - Response Rate (how quickly/reliably they respond): 0-100
         - Enthusiasm (message length, emoji/media usage): 0-100
         - Consistency (regular participation): 0-100
         
      5. Determine if one user is "cooked" - meaning they're showing much more interest or effort in the conversation than the other. 
         Being "cooked" means they're clearly more invested in the relationship/conversation.
      
      6. Analyze each participant's attachment style based on their messaging behavior:
         - Secure: Shows consistent communication, healthy boundaries, direct expression of needs
         - Anxious: Shows fear of abandonment, excessive messaging, seeks constant reassurance
         - Avoidant: Shows emotional distance, delayed responses, avoids deep conversation
         - Disorganized: Shows unpredictable patterns, mixed signals, hot/cold behavior
         
         For each person, provide:
         - Primary attachment style
         - Secondary attachment style (if applicable)
         - Percentage breakdown of each style
         - Short description explaining their attachment patterns
         - Confidence level of this assessment (0-100)
         
      7. Calculate a match percentage (0-100) that indicates how compatible the participants are, and provide:
         - Overall compatibility score (0-100)
         - List of reasons why they are compatible/suitable for each other (at least 3 points)
         - List of incompatibilities/reasons they might not be suitable (at least 3 points)
         - Confidence level of this assessment (0-100)
      
      Chat Statistics:
      ${JSON.stringify(chatSummary, null, 2)}
      
      Sample Messages:
      ${JSON.stringify(sampleMessages, null, 2)}
      
      IMPORTANT: IN YOUR RESPONSE, USE THE ACTUAL NAMES FROM THE MESSAGES INSTEAD OF "USER1" OR "USER2".
      
      Respond in the following JSON format only:
      {
        "aiSummary": "detailed 3-4 paragraph summary of chat dynamics",
        "relationshipHealthScore": {
          "overall": 75,
          "details": {
            "balance": 80,
            "engagement": 85,
            "positivity": 70,
            "consistency": 65
          },
          "redFlags": ["flag1", "flag2"]
        },
        "interestPercentage": {
          "User1": {
            "score": 85,
            "details": {
              "initiation": 90,
              "responseRate": 80,
              "enthusiasm": 85,
              "consistency": 85
            }
          },
          "User2": {
            "score": 70,
            "details": {
              "initiation": 60,
              "responseRate": 75,
              "enthusiasm": 65,
              "consistency": 80
            }
          }
        },
        "cookedStatus": {
          "isCooked": true,
          "user": "User1",
          "confidence": 90
        },
        "attachmentStyles": {
          "User1": {
            "user": "User1",
            "primaryStyle": "Anxious",
            "secondaryStyle": "Secure",
            "confidence": 85,
            "details": {
              "secure": 35,
              "anxious": 60,
              "avoidant": 10,
              "disorganized": 5
            },
            "description": "Shows signs of anxious attachment with frequent messaging and seeking reassurance, but also has secure tendencies in expressing needs directly."
          },
          "User2": {
            "user": "User2",
            "primaryStyle": "Avoidant",
            "confidence": 75,
            "details": {
              "secure": 20,
              "anxious": 5,
              "avoidant": 70,
              "disorganized": 5
            },
            "description": "Displays classic avoidant behavior with delayed responses and emotional distance."
          }
        },
        "matchPercentage": {
          "score": 65,
          "compatibility": {
            "reasons": [
              "Both show consistent communication patterns throughout the day",
              "They share similar interests based on topic discussions",
              "Their communication styles complement each other"
            ],
            "incompatibilities": [
              "Significant difference in response times",
              "Unbalanced emotional investment in the conversation",
              "Different attachment styles may create friction"
            ]
          },
          "confidence": 80
        }
      }
    `;

    const chatSession = model.startChat({
      generationConfig,
    });

    const result = await chatSession.sendMessage(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let jsonString = jsonMatch ? jsonMatch[0] : responseText;

    try {
      // First attempt to parse as is
      const insights = JSON.parse(jsonString);

      return {
        aiSummary: insights.aiSummary,
        relationshipHealthScore: insights.relationshipHealthScore,
        interestPercentage: insights.interestPercentage,
        cookedStatus: insights.cookedStatus,
        attachmentStyles: insights.attachmentStyles,
        matchPercentage: insights.matchPercentage,
      };
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);

      // Try to repair common JSON issues - first attempt
      try {
        console.log("Attempting first JSON repair...");
        // Fix trailing commas
        jsonString = jsonString.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

        // Fix missing quotes around property names
        jsonString = jsonString.replace(
          /(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g,
          '$1"$2":',
        );

        // Try parsing again after repairs
        const insights = JSON.parse(jsonString);

        return {
          aiSummary: insights.aiSummary,
          relationshipHealthScore: insights.relationshipHealthScore,
          interestPercentage: insights.interestPercentage,
          cookedStatus: insights.cookedStatus,
          attachmentStyles: insights.attachmentStyles,
          matchPercentage: insights.matchPercentage,
        };
      } catch (repairError) {
        console.error("First repair attempt failed:", repairError);

        // Try more aggressive JSON repair - second attempt
        try {
          console.log("Attempting second JSON repair...");

          // Try to extract just the main parts we need using regex patterns
          // This is a last resort if the JSON is badly malformed
          const aiSummaryMatch = responseText.match(
            /"aiSummary"\s*:\s*"([^"]*)"/,
          );

          // If we can extract at least the basic info, construct a simpler valid JSON
          if (aiSummaryMatch) {
            console.log("Extracted partial data through regex");
            const simplifiedJSON = {
              aiSummary: aiSummaryMatch[1],
              relationshipHealthScore: {
                overall: 50,
                details: {
                  balance: 50,
                  engagement: 50,
                  positivity: 50,
                  consistency: 50,
                },
                redFlags: [],
              },
              interestPercentage: {},
              cookedStatus: {
                isCooked: false,
                user: Object.keys(stats.messagesByUser || {})[0] || "Unknown",
                confidence: 0,
              },
              attachmentStyles: {},
              matchPercentage: {
                score: 50,
                compatibility: {
                  reasons: [
                    "Compatibility analysis could not be fully generated.",
                  ],
                  incompatibilities: [
                    "Incompatibility analysis could not be fully generated.",
                  ],
                },
                confidence: 0,
              },
            };

            return simplifiedJSON;
          }

          console.error("Failed to repair JSON - all attempts exhausted");
          console.error(
            "Original response:",
            responseText.substring(0, 500) + "...",
          );
          return getDefaultAIInsights(stats);
        } catch (finalAttemptError) {
          console.error("All JSON repair attempts failed:", finalAttemptError);
          return getDefaultAIInsights(stats);
        }
      }
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return getDefaultAIInsights(stats);
  }
}

function getDefaultAIInsights(stats: ChatStats): {
  aiSummary: string;
  relationshipHealthScore: RelationshipHealthScore;
  interestPercentage: Record<string, InterestPercentage>;
  cookedStatus: CookedStatus;
  attachmentStyles: Record<string, AttachmentStyle>;
  matchPercentage: MatchPercentage;
} {
  const users = Object.keys(stats.messagesByUser || {});

  const defaultInsights = {
    aiSummary:
      "AI chat summary could not be generated. Please try again later.",
    relationshipHealthScore: {
      overall: 50,
      details: {
        balance: 50,
        engagement: 50,
        positivity: 50,
        consistency: 50,
      },
      redFlags: [],
    },
    interestPercentage: {} as Record<string, InterestPercentage>,
    cookedStatus: {
      isCooked: false,
      user: users.length > 0 ? users[0] : "Unknown",
      confidence: 0,
    },
    attachmentStyles: {} as Record<string, AttachmentStyle>,
    matchPercentage: {
      score: 50,
      compatibility: {
        reasons: ["Compatibility analysis could not be generated."],
        incompatibilities: ["Incompatibility analysis could not be generated."],
      },
      confidence: 0,
    },
  };

  users.forEach((user) => {
    defaultInsights.interestPercentage[user] = {
      score: 50,
      details: {
        initiation: 50,
        responseRate: 50,
        enthusiasm: 50,
        consistency: 50,
      },
    };

    defaultInsights.attachmentStyles[user] = {
      user: user,
      primaryStyle: "Unknown",
      confidence: 0,
      details: {
        secure: 25,
        anxious: 25,
        avoidant: 25,
        disorganized: 25,
      },
      description: "Attachment style analysis could not be generated.",
    };
  });

  return defaultInsights;
}
