import { ChatStats } from "@/types";

export type ThemeId = "light" | "dark" | "rose" | "ocean" | "sunset" | "purple";

export interface ScorecardTheme {
  id: ThemeId;
  name: string;
  background: string;
  cardBg: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  metricCardBg: string;
  metricCardText: string;
  metricCardAccent: string;
}

export type NameDisplayOption =
  | "full"
  | "first"
  | "initials"
  | "custom"
  | "hidden";

export interface ScorecardSettings {
  theme: ThemeId;
  nameDisplay: NameDisplayOption;
  customNames: Record<string, string>;
  blurNames: boolean;
  metrics: {
    chemistryScore: boolean;
    totalMessages: boolean;
    balanceScore: boolean;
    interestLevels: boolean;
    topEmojis: boolean;
    relationshipHealth: boolean;
    redFlags: boolean;
    attachmentStyles: boolean;
    responseTimePerUser: boolean;
  };
}

export const DEFAULT_SETTINGS: ScorecardSettings = {
  theme: "rose",
  nameDisplay: "full",
  customNames: {},
  blurNames: false,
  metrics: {
    chemistryScore: true,
    totalMessages: true,
    balanceScore: true,
    interestLevels: true,
    topEmojis: true,
    relationshipHealth: true,
    redFlags: true,
    attachmentStyles: true,
    responseTimePerUser: true,
  },
};

export interface ScorecardProps {
  stats: ChatStats;
}
