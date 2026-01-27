"use client";

import React, { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import Link from "next/link";
import { upload } from '@vercel/blob/client';
import { toast } from "sonner";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Trash2, ShieldCheck, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { deleteBlob } from "@/actions/blob";

interface FileUploadProps {
  onBlobUploaded: (blobUrl: string) => void;
  blobUrl?: string | null;
  onBlobDeleted?: () => void;
}

export function FileUpload({ onBlobUploaded, blobUrl, onBlobDeleted }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      try {
        setIsUploading(true);
        setUploadProgress(0);
        setFileName(file.name);

        // Always upload to blob storage for Option B
        // (all processing happens in background job)
        const newBlob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          onUploadProgress: (progressEvent) => {
            const percentage = Math.round(progressEvent.percentage);
            setUploadProgress(percentage);
          },
        });

        onBlobUploaded(newBlob.url);
        toast.success("File uploaded successfully!");
        // Show privacy dialog after successful upload
        setShowPrivacyDialog(true);
      } catch (error) {
        console.error("Error uploading to Blob:", error);
        toast.error("Failed to upload file. Please try again.");
        setFileName(null);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleDeleteFile = async () => {
    if (!blobUrl) return;

    setIsDeleting(true);
    try {
      const result = await deleteBlob(blobUrl);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete file');
      }

      setFileName(null);
      onBlobDeleted?.();
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-1 sm:space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="file">Upload Chat File</Label>
        <Link
          href="/help"
          className="text-xs md:text-sm text-primary underline-offset-2 underline"
        >
          How do I get my chat file?
        </Link>
      </div>
      <Input
        type="file"
        id="file"
        accept=".json, .txt"
        onChange={handleChange}
        required
        disabled={isUploading || !!blobUrl}
      />
      {isUploading && (
        <div className="space-y-2 mt-4">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
            <span>Uploading file... {uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      {!isUploading && fileName && blobUrl && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700 truncate">
                ✓ {fileName}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeleteFile}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete file</span>
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <strong>Privacy note:</strong> Your chat file will only be used for analysis and will be automatically deleted from our storage right when the analysis is complete. You can also delete it now if you change your mind.
            </p>
          </div>
        </div>
      )}

      {/* Privacy alert dialog shown after upload */}
      <AlertDialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Your Privacy Matters
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              <p>
                Your chat file has been uploaded securely. Here&apos;s how we handle your data:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Your file is used <strong>only for analysis</strong></li>
                <li>It will be <strong>automatically deleted</strong> from our storage right when analysis is complete</li>
                <li>You can delete it immediately using the trash icon if you change your mind</li>
                <li>This project is <strong>open source</strong> for full transparency</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={handleDeleteFile}
              className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Now
            </AlertDialogCancel>
            <AlertDialogAction>
              Continue with Analysis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}