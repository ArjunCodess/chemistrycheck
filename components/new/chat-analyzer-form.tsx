"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlatformSelector } from "../shared/platform-selector";
import { FileUpload } from "./file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Platform } from "@/lib/platform-instructions";

export function ChatAnalyzerForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [name, setName] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleBlobUploaded = (url: string) => {
    setBlobUrl(url);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blobUrl || !platform) {
      toast.error(
        platform ? "Please upload a file first" : "Please select a platform"
      );
      return;
    }

    if (!session?.user) {
      toast.error("You must be signed in to analyze chats");
      return;
    }

    setIsLoading(true);
    try {
      toast.info("Queueing analysis...");

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          blobUrl,
          platform,
          name: name || "Untitled Analysis",
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({
          error: `Server error: ${response.status} ${response.statusText}`,
        }));
        throw new Error(
          data.error || data.details || "Failed to queue analysis"
        );
      }

      const data = await response.json();
      toast.success("Analysis queued! Processing in background...");

      // Navigate to analysis page where user will see processing state
      if (data.analysisId) {
        router.push(`/analysis/${data.analysisId}`);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error submitting analysis:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start analysis"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="analysis-name">Analysis Name (optional)</Label>
        <Input
          id="analysis-name"
          type="text"
          placeholder="E.g., 'Conversation with Alex' or 'Group Chat Analysis'"
          value={name}
          onChange={handleNameChange}
          className="text-sm sm:text-base"
        />
      </div>
      <PlatformSelector
        platform={platform}
        setPlatform={setPlatform as (p: Platform) => void}
      />
      <FileUpload onBlobUploaded={handleBlobUploaded} />
      <Button
        type="submit"
        disabled={!blobUrl || !platform || isLoading || !session}
        className="w-full py-2 sm:py-3 text-sm sm:text-base transition-colors"
      >
        {isLoading ? "Queueing..." : "Analyze Chat"}
      </Button>
      {!session && (
        <p className="text-sm text-red-500">
          You must be signed in to analyze chats
        </p>
      )}
    </form>
  );
}
