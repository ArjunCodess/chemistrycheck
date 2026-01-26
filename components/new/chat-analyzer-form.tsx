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
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [name, setName] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setBlobUrl(null);
    }
  };

  const handleBlobUploaded = (url: string) => {
    setBlobUrl(url);
    setFile(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!file && !blobUrl) || !platform) {
      toast.error(
        platform ? "Please select a file" : "Please select a platform"
      );
      return;
    }

    if (!session?.user) {
      toast.error("You must be signed in to analyze chats");
      return;
    }

    setIsLoading(true);
    try {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Analysis in progress. Are you sure you want to leave?";
        return e.returnValue;
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      if (blobUrl) {
        toast.info("Analyzing chat from uploaded file...");

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
            data.error || data.details || "Failed to analyze chat"
          );
        }

        const data = await response.json();
        toast.success("Chat analysis complete!");

        window.removeEventListener("beforeunload", handleBeforeUnload);

        setTimeout(() => {
          if (data.analysisId) {
            router.push(`/analysis/${data.analysisId}`);
          } else {
            router.push("/dashboard");
          }
        }, 500);
      } else if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("platform", platform);
        formData.append("name", name || "Untitled Analysis");

        toast.info("Uploading file and analyzing chat...");

        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 413) {
            throw new Error(
              "File too large. Please use a smaller chat export file."
            );
          }

          const data = await response.json().catch(() => ({
            error: `Server error: ${response.status} ${response.statusText}`,
          }));
          throw new Error(
            data.error || data.details || "Failed to analyze chat"
          );
        }

        const data = await response.json();
        toast.success("Chat analysis complete!");

        window.removeEventListener("beforeunload", handleBeforeUnload);

        setTimeout(() => {
          if (data.analysisId) {
            router.push(`/analysis/${data.analysisId}`);
          } else {
            router.push("/dashboard");
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze chat"
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
      <FileUpload
        handleFileChange={handleFileChange}
        onBlobUploaded={handleBlobUploaded}
      />
      <Button
        type="submit"
        disabled={(!file && !blobUrl) || !platform || isLoading || !session}
        className="w-full py-2 sm:py-3 text-sm sm:text-base transition-colors"
      >
        {isLoading ? "Analyzing..." : "Analyze Chat"}
      </Button>
      {!session && (
        <p className="text-sm text-red-500">
          You must be signed in to analyze chats
        </p>
      )}
    </form>
  );
}
