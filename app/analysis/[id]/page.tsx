"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { redirect, useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ArrowLeft, Menu, Edit2, Check, X, Globe, Lock, Share2, Copy } from "lucide-react";
import { createSafeStats } from "@/lib/chat-stats";
import { ChatStats } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { BasicStats } from "@/components/dashboard/basic-stats";
import { ResponseTimes } from "@/components/dashboard/response-times";
import { ActivityPatterns } from "@/components/dashboard/activity-patterns";
import { Media } from "@/components/dashboard/media";
import { EmojiAnalysis } from "@/components/dashboard/emoji-analysis";
import { AIInsights } from "@/components/dashboard/ai-insights";
import { TLDR } from "@/components/dashboard/tldr";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";

const TabLoadingFallback = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
    <div className="h-64 bg-neutral-200 rounded"></div>
    <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
    <div className="h-32 bg-neutral-200 rounded"></div>
  </div>
);

export default function AnalysisDashboard() {
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState<"pending" | "processing" | "ready" | "failed">("pending");
  const [analysisDetails, setAnalysisDetails] = useState<{
    name: string;
    createdAt: string;
    platform: string;
    isPublic: boolean;
    userId: string;
  } | null>(null);
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;
  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, Record<number, boolean>>
  >({});
  const [activeTab, setActiveTab] = useState("tldr");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      const checkAnalysisAccess = async () => {
        try {
          const response = await fetch(`/api/analyses/${analysisId}`);
          if (!response.ok) {
            redirect("/sign-in");
          }
        } catch (error) {
          console.error("Error checking analysis access:", error);
          redirect("/sign-in");
        }
      };

      checkAnalysisAccess();
    }
  }, [session, isPending, analysisId]);

  const toggleMessageExpand = useCallback((user: string, index: number) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [user]: {
        ...(prev[user] || {}),
        [index]: !prev[user]?.[index],
      },
    }));
  }, []);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/analyses/${analysisId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch analysis");
        }

        const data = await response.json();

        // Set embedding status
        setJobStatus(data.jobStatus || "ready");

        // Only set stats if they're available (not empty object)
        if (data.stats && Object.keys(data.stats).length > 0) {
          setStats(data.stats);
        }

        setAnalysisDetails({
          name: data.name,
          createdAt: data.createdAt,
          platform: data.platform,
          isPublic: data.isPublic || false,
          userId: data.userId
        });
        setEditedName(data.name || "Untitled Analysis");

        if (data.isPublic) {
          setShareUrl(`${window.location.origin}/analysis/${analysisId}`);
        } else {
          setShareUrl(null);
        }
      } catch (error) {
        console.error("Error fetching analysis:", error);
        toast.error("Failed to load analysis");
      } finally {
        setIsLoading(false);
      }
    };

    if (analysisId) {
      fetchAnalysis();
    }
  }, [analysisId]);

  // Poll for status updates while processing
  useEffect(() => {
    if (jobStatus !== "pending" && jobStatus !== "processing") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/analyses/${analysisId}`);
        if (response.ok) {
          const data = await response.json();
          setJobStatus(data.jobStatus || "ready");

          // Update stats if now available
          if (data.stats && Object.keys(data.stats).length > 0) {
            setStats(data.stats);
          }

          // Stop polling if ready or failed
          if (data.jobStatus === "ready" || data.jobStatus === "failed") {
            clearInterval(pollInterval);
            if (data.jobStatus === "ready") {
              toast.success("Analysis complete!");
            } else {
              toast.error("Analysis failed. Please try again.");
            }
          }
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [analysisId, jobStatus]);

  const handleUploadNewChat = () => {
    router.push("/new");
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) {
      setEditedName(analysisDetails?.name || "Untitled Analysis");
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch(`/api/analyses/${analysisId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: editedName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to update analysis name");
      }

      setAnalysisDetails((prev) =>
        prev ? { ...prev, name: editedName.trim(), isPublic: prev.isPublic } : null
      );
      setIsEditingName(false);
      toast.success("Analysis name updated");
    } catch (error) {
      console.error("Error updating analysis name:", error);
      toast.error("Failed to update analysis name");
    }
  };

  const togglePublicStatus = async () => {
    if (!analysisDetails) return;

    const newPublicStatus = !analysisDetails.isPublic;

    try {
      const response = await fetch(`/api/analyses/${analysisId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ isPublic: newPublicStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update sharing status");
      }

      setAnalysisDetails((prev) =>
        prev ? { ...prev, isPublic: newPublicStatus } : null
      );

      if (newPublicStatus) {
        setShareUrl(`${window.location.origin}/analysis/${analysisId}`);
        toast.success("Analysis is now public and shareable");
      } else {
        setShareUrl(null);
        toast.success("Analysis is now private");
      }
    } catch (error) {
      console.error("Error updating sharing status:", error);
      toast.error("Failed to update sharing status");
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="text-xl">Loading analytics...</div>
      </div>
    );
  }

  // Show processing state while job is running (Option B)
  if (jobStatus === "pending" || jobStatus === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-xl font-medium">
          {jobStatus === "pending" ? "Preparing analysis..." : "Processing your chat..."}
        </div>
        <p className="text-neutral-500 text-center max-w-md">
          We&apos;re parsing your conversation and generating insights.
          This may take a few moments for large chats.
        </p>
        <p className="text-sm text-neutral-400">
          {analysisDetails?.platform && `Platform: ${analysisDetails.platform.charAt(0).toUpperCase() + analysisDetails.platform.slice(1)}`}
        </p>
      </div>
    );
  }

  // Show error state if processing failed
  if (jobStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl text-red-500">Analysis Failed</div>
        <p className="text-neutral-500 text-center max-w-md">
          There was an error processing your chat. Please try uploading again.
        </p>
        <Button onClick={() => router.push("/new")}>
          Upload New Chat
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl">Analysis not found or no longer available</div>
        <Button className="mt-4" onClick={() => router.push("/new")}>
          Upload New Chat
        </Button>
      </div>
    );
  }

  if (stats.messagesByUser && stats.messagesByUser.unknown) {
    delete stats.messagesByUser.unknown;
    stats.totalMessages = Object.values(stats.messagesByUser).reduce(
      (sum, count) => sum + (count as number),
      0
    );
  }

  const safeStats = createSafeStats(stats);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 mb-4 md:pb-8 md:mb-8 border-b">
        <div>
          {session && isEditingName ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-2xl sm:text-3xl md:text-4xl font-bold border-b-2 border-primary outline-none bg-transparent min-w-[300px] w-fit"
                autoFocus
              />
              <button
                onClick={handleUpdateName}
                className="p-1 rounded-full hover:bg-neutral-100"
                aria-label="Save name"
              >
                <Check className="h-5 w-5 text-green-500" />
              </button>
              <button
                onClick={() => {
                  setEditedName(analysisDetails?.name || "Untitled Analysis");
                  setIsEditingName(false);
                }}
                className="p-1 rounded-full hover:bg-neutral-100"
                aria-label="Cancel editing"
              >
                <X className="h-5 w-5 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                {analysisDetails?.name || "Chat Analytics"}
              </h1>
              {session && session.user && analysisDetails?.userId === session.user.id && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Edit analysis name"
                >
                  <Edit2 className="h-4 w-4 text-neutral-500" />
                </button>
              )}
              {(!session || (session.user && analysisDetails?.userId !== session.user.id)) && analysisDetails?.isPublic && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Shared
                </span>
              )}
            </div>
          )}
          {analysisDetails?.createdAt && (
            <p className="text-sm text-neutral-500 mt-1">
              Analysis from{" "}
              {new Date(analysisDetails.createdAt).toLocaleString()}
            </p>
          )}
          {analysisDetails?.platform && (
            <p className="text-sm text-neutral-500">
              Platform:{" "}
              {analysisDetails.platform.charAt(0).toUpperCase() +
                analysisDetails.platform.slice(1)}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-fit gap-2 mt-2 sm:mt-auto sm:mb-0">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-1/2 md:w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {session && session.user && analysisDetails?.userId === session.user.id && (
            <>
              <div className="relative w-full sm:w-1/2 md:w-fit">
                {analysisDetails?.isPublic ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Share2 className="h-4 w-4 mr-2" /> Share
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="sm:w-[300px] p-3">
                      <div className="text-sm text-center mb-2 text-neutral-700">
                        Share this analysis
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Input
                          type="text"
                          value={shareUrl || ''}
                          readOnly
                          className="text-xs p-1 border w-full truncate bg-neutral-50 rounded-md"
                        />
                        <Button
                          size="icon"
                          onClick={copyShareUrl}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-1"
                        onClick={togglePublicStatus}
                      >
                        <Lock className="h-3 w-3 mr-2" /> Make Private
                      </Button>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="outline"
                    onClick={togglePublicStatus}
                    className="w-full"
                  >
                    <Globe className="h-4 w-4 mr-2" /> Make Public
                  </Button>
                )}
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-1/2 md:w-fit">
                    Delete Analysis
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      this analysis and all its data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `/api/analyses/${analysisId}`,
                            {
                              method: "DELETE",
                              credentials: "include",
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to delete analysis");
                          }

                          toast.success("Analysis deleted successfully");
                          router.push("/dashboard");
                        } catch (error) {
                          console.error("Error deleting analysis:", error);
                          toast.error("Failed to delete analysis");
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {(!session || (session.user && analysisDetails?.userId !== session.user.id)) && analysisDetails?.isPublic && (
            <Button
              variant="outline"
              onClick={copyShareUrl}
              className="w-full sm:w-1/2 md:w-fit"
            >
              <Copy className="h-4 w-4 mr-2" /> Copy Link
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:block">
        <Tabs
          defaultValue="tldr"
          className="w-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-6 w-full overflow-x-auto">
            <TabsTrigger value="tldr">TL;DR</TabsTrigger>
            <TabsTrigger value="basic">Basic Stats</TabsTrigger>
            <TabsTrigger value="time">Response Times</TabsTrigger>
            <TabsTrigger value="activity">Activity Patterns</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="emoji">Emoji Analysis</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>

          <div className="px-1 overflow-hidden h-full">
            <TabsContent value="tldr" className="mt-0 overflow-x-auto h-full">
              <Suspense fallback={<TabLoadingFallback />}>
                <TLDR stats={safeStats} />
              </Suspense>
            </TabsContent>

            <TabsContent value="basic" className="mt-0 overflow-x-auto">
              <Suspense fallback={<TabLoadingFallback />}>
                <BasicStats
                  stats={safeStats}
                  expandedMessages={expandedMessages}
                  toggleMessageExpand={toggleMessageExpand}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="time" className="mt-0 overflow-x-auto">
              <Suspense fallback={<TabLoadingFallback />}>
                <ResponseTimes stats={safeStats} />
              </Suspense>
            </TabsContent>

            <TabsContent value="activity" className="mt-0 overflow-x-auto">
              <Suspense fallback={<TabLoadingFallback />}>
                <ActivityPatterns stats={safeStats} />
              </Suspense>
            </TabsContent>

            <TabsContent value="media" className="mt-0 overflow-x-auto">
              <Suspense fallback={<TabLoadingFallback />}>
                <Media stats={safeStats} />
              </Suspense>
            </TabsContent>

            <TabsContent value="emoji" className="mt-0 overflow-x-auto">
              <Suspense fallback={<TabLoadingFallback />}>
                <EmojiAnalysis stats={safeStats} />
              </Suspense>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 overflow-x-auto">
              <Suspense fallback={<TabLoadingFallback />}>
                <AIInsights
                  stats={safeStats}
                  onUploadNewChat={handleUploadNewChat}
                />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden mb-6">
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              className="w-full flex justify-between items-center"
            >
              <span>
                {activeTab === "tldr"
                  ? "TLDR"
                  : activeTab === "basic"
                    ? "Basic Stats"
                    : activeTab === "time"
                      ? "Response Times"
                      : activeTab === "media"
                        ? "Media"
                        : activeTab === "emoji"
                          ? "Emoji Analysis"
                          : activeTab === "ai"
                            ? "AI Insights"
                            : "Activity Patterns"}
              </span>
              <Menu className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-140 px-4">
            <DrawerTitle />
            <div className="grid grid-cols-1 gap-4 pt-8">
              <Button
                variant={activeTab === "tldr" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("tldr");
                  setDrawerOpen(false);
                }}
                className="justify-start"
              >
                TLDR
              </Button>
              <Button
                variant={activeTab === "basic" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("basic");
                  setDrawerOpen(false);
                }}
                className="justify-start"
              >
                Basic Stats
              </Button>
              <Button
                variant={activeTab === "time" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("time");
                  setDrawerOpen(false);
                }}
                className="justify-start"
              >
                Response Times
              </Button>
              <Button
                variant={activeTab === "activity" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("activity");
                  setDrawerOpen(false);
                }}
                className="justify-start"
              >
                Activity Patterns
              </Button>
              <Button
                variant={activeTab === "media" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("media");
                  setDrawerOpen(false);
                }}
                className="justify-start"
              >
                Media
              </Button>
              <Button
                variant={activeTab === "emoji" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("emoji");
                  setDrawerOpen(false);
                }}
                className="justify-start"
              >
                Emoji Analysis
              </Button>
              <Button
                variant={activeTab === "ai" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("ai");
                  setDrawerOpen(false);
                }}
                className="justify-start"
              >
                AI Insights
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Mobile Tabs Content */}
      <div className="md:hidden overflow-hidden">
        {activeTab === "tldr" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="overflow-x-auto h-full">
              <TLDR stats={safeStats} />
            </div>
          </Suspense>
        )}
        {activeTab === "basic" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="overflow-x-auto">
              <BasicStats
                stats={safeStats}
                expandedMessages={expandedMessages}
                toggleMessageExpand={toggleMessageExpand}
              />
            </div>
          </Suspense>
        )}
        {activeTab === "time" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="overflow-x-auto">
              <ResponseTimes stats={safeStats} />
            </div>
          </Suspense>
        )}
        {activeTab === "activity" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="overflow-x-auto">
              <ActivityPatterns stats={safeStats} />
            </div>
          </Suspense>
        )}
        {activeTab === "media" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="overflow-x-auto">
              <Media stats={safeStats} />
            </div>
          </Suspense>
        )}
        {activeTab === "emoji" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="overflow-x-auto">
              <EmojiAnalysis stats={safeStats} />
            </div>
          </Suspense>
        )}
        {activeTab === "ai" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="overflow-x-auto">
              <AIInsights
                stats={safeStats}
                onUploadNewChat={handleUploadNewChat}
              />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}