import { serve } from "inngest/next";
import { inngest, functions } from "@/lib/inngest";

// Create the serve handler for Next.js
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
