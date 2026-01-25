import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/shared/header";
import { config } from "dotenv";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { ChatSidebarProvider } from "@/components/providers/chat-sidebar-provider";

config({ path: ".env" });

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChemistryCheck - Chat Analysis & Insights",
  description: "AI-powered chat analysis tool for messaging platforms",
  applicationName: "ChemistryCheck",
  authors: [{ name: "Arjun Vijay Prakash" }],
  generator: "Next.js",
  keywords: [
    "chat analysis",
    "messaging",
    "analytics",
    "AI",
    "insights",
    "communication patterns",
  ],
  referrer: "origin-when-cross-origin",
  creator: "Arjun Vijay Prakash",
  publisher: "Arjun Vijay Prakash",
  metadataBase: new URL(process.env.APP_URL!),
  openGraph: {
    title: "ChemistryCheck - Chat Analysis & Insights",
    description: "AI-powered chat analysis tool for messaging platforms",
    type: "website",
    siteName: "ChemistryCheck",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 600,
        alt: "ChemistryCheck - Chat Analysis & Insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChemistryCheck - Chat Analysis & Insights",
    description: "AI-powered chat analysis tool for messaging platforms",
    images: ["/og-image.png"],
  },
  icons: "/logo.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <ChatSidebarProvider>
          <Header />
          {children}
        </ChatSidebarProvider>
        <Toaster />
        <Analytics />
      </body>
      <Script
        defer
        data-domain="chemistrycheck.vercel.app"
        src="https://getanalyzr.vercel.app/tracking-script.js"
      />
    </html>
  );
}