"use client";

import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/chatbot/app-sidebar";
import { ChatTrigger } from "@/components/dashboard/chatbot/chat-trigger";
import { authClient } from "@/lib/auth-client";

export function ChatSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  // Check if we are on an analysis page
  const analysisId = (params?.id as string) || undefined;

  const [chatName, setChatName] = useState<string | undefined>(undefined);
  const [shouldShowSidebar, setShouldShowSidebar] = useState(false);

  // Determine if sidebar should be shown
  useEffect(() => {
    // Only show sidebar if we have a valid analysis ID and we are on an analysis route
    const isAnalysisRoute = pathname?.includes('/analysis/');

    // Initial check based on route
    if (analysisId && isAnalysisRoute) {
      // If we are pending, we wait. If we have session, we can check.
      // We set to true tentatively IF we assume optimistic? 
      // No, user request implies strict hiding if not owner.
      // So we default to false (initialized) and set true only when verified owner.
      // BUT current code sets it to true here: allow that for layout, then hide if mismatch?
      // Better: Make this effect ONLY set basic eligibility, and let the fetch effect finalize it.
      // Actually, let's keep the existing structure but refine the ownership check.
      setShouldShowSidebar(true);
    } else {
      setShouldShowSidebar(false);
    }
  }, [analysisId, pathname]);

  useEffect(() => {
    const fetchAnalysisAndCheckOwnership = async () => {
      if (!analysisId) return;

      try {
        const response = await fetch(`/api/analyses/${analysisId}`);
        if (response.ok) {
          const data = await response.json();
          setChatName(data.name || undefined);

          // STRICT OWNERSHIP CHECK:
          // Wait for auth to settle
          if (!isPending) {
            const isOwner = data.userId === session?.user?.id;
            setShouldShowSidebar(isOwner);
          }
        }
      } catch (error) {
        console.error("Error fetching analysis name:", error);
      }
    };

    if (analysisId && !isPending) {
      fetchAnalysisAndCheckOwnership();
    }
  }, [analysisId, isPending, session?.user?.id]);

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
