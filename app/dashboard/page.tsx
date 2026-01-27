"use client";

import { useEffect, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { MessageCircle, Users, AlertCircle, Trash2 } from "lucide-react";
import { Whatsapp } from "@/components/ui/svgs/whatsapp";
import { Telegram } from "@/components/ui/svgs/telegram";
import { Instagram } from "@/components/ui/svgs/instagram";
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

interface Analysis {
  id: string;
  name: string;
  platform: string;
  createdAt: string;
  totalMessages: number | null;
  totalWords: number | null;
  participantCount: number | null;
  jobStatus: "pending" | "processing" | "ready" | "failed";
}

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      redirect("/sign-in");
    }
  }, [session, isPending]);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/analyses", {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error("Failed to fetch analyses");
        }

        const data = await response.json();
        setAnalyses(data);
      } catch (error) {
        console.error("Error fetching analyses:", error);
        toast.error("Failed to load analyses history");
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchAnalyses();
    }
  }, [session]);

  const handleViewAnalysis = (id: string) => {
    router.push(`/analysis/${id}`);
  };

  const handleNewAnalysis = () => {
    router.push("/new");
  };

  const handleDeleteAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete analysis');
      }

      toast.success('Analysis deleted successfully');

      // Update the analyses list by removing the deleted one
      setAnalyses(analyses.filter(analysis => analysis.id !== id));
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Failed to delete analysis');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 mb-4 md:pb-8 md:mb-8 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            View and access your previous chat analyses
          </p>
        </div>
        <Button onClick={handleNewAnalysis} className="mt-4 md:mt-0">
          New Analysis
        </Button>
      </div>

      {analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-neutral-400 mb-4" />
          <h2 className="text-xl font-medium text-neutral-900 mb-2">
            No analyses yet
          </h2>
          <p className="text-neutral-500 mb-6 text-center max-w-md">
            You haven&apos;t analyzed any chats yet. Upload a chat file to get started.
          </p>
          <Button onClick={handleNewAnalysis}>
            Analyze Your First Chat
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card className="w-full overflow-x-auto">
            <CardHeader>
              <CardTitle>Your Chat Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyses.map((analysis) => (
                      <TableRow key={analysis.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{analysis.name || "Untitled Analysis"}</span>
                            {analysis.jobStatus === "pending" && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Queued
                              </span>
                            )}
                            {analysis.jobStatus === "processing" && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full animate-pulse">
                                Processing
                              </span>
                            )}
                            {analysis.jobStatus === "failed" && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                Failed
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {analysis.platform === "whatsapp" && <Whatsapp className="h-4 w-4" />}
                            {analysis.platform === "telegram" && <Telegram className="h-4 w-4" />}
                            {analysis.platform === "instagram" && <Instagram className="h-4 w-4" />}
                            <span>{analysis.platform.charAt(0).toUpperCase() + analysis.platform.slice(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(analysis.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4 text-neutral-500" />
                            <span>
                              {(analysis.jobStatus === "pending" || analysis.jobStatus === "processing")
                                ? "—"
                                : (analysis.totalMessages?.toLocaleString() ?? "0")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-neutral-500" />
                            <span>
                              {(analysis.jobStatus === "pending" || analysis.jobStatus === "processing")
                                ? "—"
                                : (analysis.participantCount ?? "0")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleViewAnalysis(analysis.id)}
                          >
                            View Analysis
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this analysis and all its data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAnalysis(analysis.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}