"use client";

import { RefObject, useState } from "react";
import { toPng, toJpeg } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScorecardExportProps {
  cardRef: RefObject<HTMLDivElement | null>;
  analysisName?: string;
}

export function ScorecardExport({
  cardRef,
  analysisName = "chemistry-scorecard",
}: ScorecardExportProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const filename = analysisName.toLowerCase().replace(/\s+/g, "-");

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;

    try {
      setIsExporting("png");
      toast.loading("Generating PNG...", { id: "export" });

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        fontEmbedCSS: "",
        skipAutoScale: true,
      });

      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("PNG downloaded!", { id: "export" });
    } catch (error) {
      console.error("Failed to export PNG:", error);
      toast.error("Failed to export PNG", { id: "export" });
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadJpeg = async () => {
    if (!cardRef.current) return;

    try {
      setIsExporting("jpeg");
      toast.loading("Generating JPEG...", { id: "export" });

      const dataUrl = await toJpeg(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
        fontEmbedCSS: "",
        skipAutoScale: true,
      });

      const link = document.createElement("a");
      link.download = `${filename}.jpg`;
      link.href = dataUrl;
      link.click();

      toast.success("JPEG downloaded!", { id: "export" });
    } catch (error) {
      console.error("Failed to export JPEG:", error);
      toast.error("Failed to export JPEG", { id: "export" });
    } finally {
      setIsExporting(null);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!cardRef.current) return;

    try {
      setIsExporting("copy");
      toast.loading("Copying to clipboard...", { id: "export" });

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        fontEmbedCSS: "",
        skipAutoScale: true,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      toast.success("Copied to clipboard!", { id: "export" });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy. Try downloading instead.", { id: "export" });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleDownloadPng}
        variant="outline"
        size="sm"
        className="flex-1"
        disabled={isExporting !== null}
      >
        {isExporting === "png" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-1">PNG</span>
      </Button>

      <Button
        onClick={handleDownloadJpeg}
        variant="outline"
        size="sm"
        className="flex-1"
        disabled={isExporting !== null}
      >
        {isExporting === "jpeg" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-1">JPEG</span>
      </Button>

      <Button
        onClick={handleCopyToClipboard}
        variant="default"
        size="sm"
        className="flex-1"
        disabled={isExporting !== null}
      >
        {isExporting === "copy" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="ml-1">Copy</span>
      </Button>
    </div>
  );
}
