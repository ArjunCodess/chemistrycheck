"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChatAnalyzerForm } from "@/components/new/chat-analyzer-form";
import { authClient } from "@/lib/auth-client";
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
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const { data: session } = authClient.useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isAuthenticated = !!session;

  return (
    <main className="min-h-[calc(100vh-70px)] bg-gradient-to-b from-neutral-100 to-white px-2 py-4">
      <div className="w-full md:max-w-xl lg:max-w-2xl mx-auto flex flex-col justify-center items-center">
        <Card className="bg-card backdrop-blur-sm border-neutral-200 shadow-sm sm:gap-0">
          <CardHeader className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 pb-6">
            <div className="order-2 sm:order-1 flex-1 text-center sm:text-left sm:pr-4">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 mb-2 sm:mb-3">
                ChemistryCheck
              </CardTitle>
              <CardDescription className="text-balance text-sm sm:text-base text-neutral-600 leading-relaxed">
                Upload your chat history to analyze communication patterns and
                get insights. Open source for transparency, files are securely
                deleted after analysis.
              </CardDescription>
            </div>
            <div className="flex items-center justify-center sm:justify-end sm:order-2 order-1">
              <Image
                src="/logo.png"
                alt="ChemistryCheck"
                width={150}
                height={150}
                className="w-28 h-28 object-contain"
              />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isAuthenticated ? (
              <ChatAnalyzerForm />
            ) : (
              <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                  <div className="relative">
                    <div
                      className="absolute inset-0 z-10 bg-transparent cursor-pointer"
                      onClick={() => setIsDialogOpen(true)}
                      aria-label="Sign in to analyze chats"
                    />

                    <div className="opacity-70 pointer-events-none">
                      <ChatAnalyzerForm />
                    </div>
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Authentication Required</AlertDialogTitle>
                    <AlertDialogDescription>
                      You need to be signed in to analyze chat conversations.
                      Please sign in or create an account to continue.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="mt-2 sm:mt-0">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Link href="/sign-in">Sign In</Link>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}