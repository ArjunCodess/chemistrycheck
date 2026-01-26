import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatAnalysis, user, session as sessionTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    let userId;

    try {
      // Get current user session from auth.api.getSession
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (session?.user?.id) {
        userId = session.user.id;
      } else {
        // If no session, check for Authorization header
        const authHeader = request.headers.get("Authorization");

        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);

          // Find session by token
          const [sessionRecord] = await db
            .select()
            .from(sessionTable)
            .where(eq(sessionTable.token, token))
            .limit(1);

          if (sessionRecord && sessionRecord.userId) {
            userId = sessionRecord.userId;
          }
        }
      }

      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      // Verify that the user exists in the database
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!userRecord) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } catch (authError) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Authentication failed", details: String(authError) },
        { status: 401 },
      );
    }

    // Get all analyses for the current user, ordered by most recent first
    const analyses = await db
      .select({
        id: chatAnalysis.id,
        name: chatAnalysis.name,
        platform: chatAnalysis.platform,
        createdAt: chatAnalysis.createdAt,
        totalMessages: chatAnalysis.totalMessages,
        totalWords: chatAnalysis.totalWords,
        participantCount: chatAnalysis.participantCount,
        jobStatus: chatAnalysis.jobStatus,
      })
      .from(chatAnalysis)
      .where(eq(chatAnalysis.userId, userId))
      .orderBy(desc(chatAnalysis.createdAt));

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses", details: String(error) },
      { status: 500 },
    );
  }
}
