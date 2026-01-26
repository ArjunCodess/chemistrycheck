import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatAnalysis, user, session as sessionTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting analyze API request");

    const contentType = request.headers.get("content-type");

    let platform: string = "";
    let name: string = "Untitled Analysis";
    let blobUrl: string | null = null;

    if (contentType && contentType.includes("application/json")) {
      const jsonData = await request.json();
      platform = jsonData.platform;
      name = jsonData.name || "Untitled Analysis";
      blobUrl = jsonData.blobUrl;

      console.log(
        `Received JSON request: platform=${platform}, name=${name}, blobUrl=${blobUrl}`,
      );

      if (!blobUrl) {
        return NextResponse.json(
          { error: "No blobUrl provided" },
          { status: 400 },
        );
      }
    } else {
      // For Option B, we require blobUrl - direct file uploads should go through /api/upload first
      return NextResponse.json(
        {
          error:
            "Please upload file first via /api/upload, then call analyze with blobUrl",
        },
        { status: 400 },
      );
    }

    if (!platform) {
      return NextResponse.json(
        { error: "No platform specified" },
        { status: 400 },
      );
    }

    // Validate platform
    if (!["telegram", "whatsapp", "instagram"].includes(platform)) {
      return NextResponse.json(
        { error: "Unsupported platform" },
        { status: 400 },
      );
    }

    let userId;

    try {
      // Get current user session
      console.log("Attempting to get user session");

      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (session?.user?.id) {
        userId = session.user.id;
        console.log(`User authenticated from session: ${userId}`);
      } else {
        // If no session, check for Authorization header
        const authHeader = request.headers.get("Authorization");
        console.log(
          `Authorization header: ${authHeader ? "Present" : "Not present"}`,
        );

        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);

          const [sessionRecord] = await db
            .select()
            .from(sessionTable)
            .where(eq(sessionTable.token, token))
            .limit(1);

          if (sessionRecord && sessionRecord.userId) {
            userId = sessionRecord.userId;
            console.log(`User authenticated from token: ${userId}`);
          }
        }
      }

      if (!userId) {
        console.log("No user ID found in session or Authorization header");
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      // Verify that the user exists in the database
      console.log("Verifying user in database");
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!userRecord) {
        console.log("User record not found in database");
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      console.log("User verified in database");
    } catch (authError) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Authentication failed", details: String(authError) },
        { status: 401 },
      );
    }

    try {
      console.log("Creating minimal analysis row with pending status");

      // Create a minimal pending analysis row
      // Stats will be populated by the background job after parsing
      const [savedAnalysis] = await db
        .insert(chatAnalysis)
        .values({
          userId,
          platform,
          name,
          stats: {}, // Empty stats - will be populated by job
          jobStatus: "pending",
        })
        .returning({ id: chatAnalysis.id });

      console.log(`Analysis created with ID: ${savedAnalysis.id}`);

      // Send event to Inngest for background processing (parse + embed)
      try {
        const { inngest } = await import("@/lib/inngest");
        await inngest.send({
          name: "analysis.created",
          data: {
            analysisId: savedAnalysis.id,
            blobUrl,
            platform,
          },
        });
        console.log("Background job queued successfully");
      } catch (sendError) {
        console.error("Error sending to Inngest:", sendError);
        // Mark as failed if we can't queue the job
        await db
          .update(chatAnalysis)
          .set({ jobStatus: "failed" })
          .where(eq(chatAnalysis.id, savedAnalysis.id));

        return NextResponse.json(
          { error: "Failed to queue background job" },
          { status: 500 },
        );
      }

      // Return immediately with analysisId
      return NextResponse.json({
        analysisId: savedAnalysis.id,
        jobStatus: "pending",
        message: "Analysis queued for processing",
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          error: "Failed to create analysis",
          details: String(dbError),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in analyze API:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: String(error) },
      { status: 500 },
    );
  }
}
