import { Inngest } from "inngest";

// Create the Inngest client for ChemistryCheck
export const inngest = new Inngest({
  id: "chemistrycheck",
});

// Type definitions for our events
export type AnalysisCreatedEvent = {
  name: "analysis.created";
  data: {
    analysisId: string;
    blobUrl: string;
    platform: string;
  };
};

export type Events = {
  "analysis.created": AnalysisCreatedEvent;
};
