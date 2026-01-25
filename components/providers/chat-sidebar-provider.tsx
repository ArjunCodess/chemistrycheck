"use client";

import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/chatbot/app-sidebar";
import { ChatTrigger } from "@/components/dashboard/chatbot/chat-trigger";

export function ChatSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  // Check if we are on an analysis page
  // The route is typically /analysis/[id] or /dashboard/[id]
  // We should check if 'id' param is present and matches the URL pattern
  const analysisId = (params?.id as string) || undefined;

  const [chatName, setChatName] = useState<string | undefined>(undefined);
  const [shouldShowSidebar, setShouldShowSidebar] = useState(false);

  // Determine if sidebar should be shown
  useEffect(() => {
    // Only show sidebar if we have a valid analysis ID and we are on an analysis route
    // This prevents it from showing up on other pages that might accidentally match param names
    const isAnalysisRoute = pathname?.includes('/analysis/') || pathname?.includes('/dashboard/');
    setShouldShowSidebar(!!analysisId && !!isAnalysisRoute);
  }, [analysisId, pathname]);

  useEffect(() => {
    const fetchAnalysisName = async () => {
      if (!analysisId) return;

      try {
        const response = await fetch(`/api/analyses/${analysisId}`);
        if (response.ok) {
          const data = await response.json();
          setChatName(data.name || undefined);
        }
      } catch (error) {
        console.error("Error fetching analysis name:", error);
      }
    };

    if (analysisId && shouldShowSidebar) {
      fetchAnalysisName();
    }
  }, [analysisId, shouldShowSidebar]);

  if (!shouldShowSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <SidebarInset>
        {children}
      </SidebarInset>
      <AppSidebar analysisId={analysisId!} chatName={chatName} />
      <ChatTrigger />
    </SidebarProvider>
  );
}
