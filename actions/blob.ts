"use server";

import { del } from "@vercel/blob";

/**
 * Delete a blob from Vercel Blob storage
 */
export async function deleteBlob(
  url: string,
): Promise<{ success: boolean; error?: string }> {
  if (!url) {
    return { success: false, error: "URL is required" };
  }

  try {
    await del(url);
    return { success: true };
  } catch (error) {
    console.error("Error deleting blob:", error);
    return { success: false, error: "Failed to delete file" };
  }
}
