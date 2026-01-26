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

  // Only consider showing sidebar when on an analysis route with an id
  const isEligibleRoute = Boolean(analysisId && pathname?.includes("/analysis/"));

  useEffect(() => {
    if (!isEligibleRoute) {
      setShouldShowSidebar(false);
    }
  }, [isEligibleRoute]);

  useEffect(() => {
    if (!analysisId || isPending) return;

    const fetchAnalysisAndCheckOwnership = async () => {
      try {
        const response = await fetch(`/api/analyses/${analysisId}`);
        if (response.ok) {
          const data = await response.json();
          setChatName(data.name || undefined);
          setShouldShowSidebar(data.userId === session?.user?.id);
        } else {
          setShouldShowSidebar(false);
        }
      } catch (error) {
        console.error("Error fetching analysis name:", error);
        setShouldShowSidebar(false);
      }
    };

    fetchAnalysisAndCheckOwnership();
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
