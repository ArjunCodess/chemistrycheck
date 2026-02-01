"use client";

import { forwardRef } from "react";
import { ChatStats } from "@/types";
import { ScorecardSettings } from "./types";
import { getTheme } from "./scorecard-themes";

interface ScorecardPreviewProps {
  stats: ChatStats;
  settings: ScorecardSettings;
}

// Helper functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatTime = (minutes: number): string => {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const getDisplayName = (
  name: string,
  settings: ScorecardSettings
): string => {
  switch (settings.nameDisplay) {
    case "hidden":
      return "•••";
    case "first":
      return name.split(" ")[0];
    case "initials":
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    case "custom":
      return settings.customNames[name] || name;
    default:
      return name;
  }
};

export const ScorecardPreview = forwardRef<HTMLDivElement, ScorecardPreviewProps>(
  ({ stats, settings }, ref) => {
    const theme = getTheme(settings.theme);
    const userNames = Object.keys(stats.messagesByUser || {}).slice(0, 2);

    // Calculate metrics
    const chemistryScore = stats.matchPercentage?.score ?? 0;
    const totalMessages = stats.totalMessages ?? 0;

    // Calculate balance per user
    const messagesByUser = stats.messagesByUser || {};
    const userCounts = Object.values(messagesByUser) as number[];
    const total = userCounts.reduce((a, b) => a + b, 0);
    const balancePercentages = userNames.map((name) => {
      const count = messagesByUser[name] || 0;
      return Math.round((count / total) * 100);
    });

    // Response times per user
    const responseTimes = stats.responseTimes || {};
    const avgReplyTimes = userNames.map((name) => responseTimes[name]?.average ?? 0);

    // Interest levels
    const interestPercentages = stats.interestPercentage || {};
    const interestLevels = userNames.map((name) =>
      interestPercentages[name]?.score ?? 0
    );

    // Top emojis
    const emojiFrequency = stats.emojiFrequency || {};
    const topEmojis = Object.entries(emojiFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emoji]) => emoji);

    // Relationship health
    const healthScore = stats.relationshipHealthScore?.overall ?? 0;
    const redFlagsCount = stats.relationshipHealthScore?.redFlags?.length ?? 0;

    // Attachment styles
    const attachmentStyles = stats.attachmentStyles || {};

    return (
      <div
        ref={ref}
        className={`${theme.background} p-6 rounded-3xl`}
      >
        {/* Header with Chemistry Score */}
        {settings.metrics.chemistryScore && (
          <div className={`${theme.cardBg} rounded-3xl p-6 text-center shadow-sm mb-4 flex flex-col justify-center`}>
            <div className={`text-sm font-medium ${theme.secondaryText} uppercase tracking-wider mb-2`}>
              Chemistry Score
            </div>
            <div className={`text-6xl md:text-7xl font-bold ${theme.accent}`}>
              {chemistryScore}%
            </div>
            <div className="flex justify-center gap-1 mt-3 text-2xl">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  style={{ opacity: i < Math.round(chemistryScore / 20) ? 1 : 0.3 }}
                >
                  💕
                </span>
              ))}
            </div>
            <div
              className={`mt-3 text-lg ${theme.primaryText} ${settings.blurNames ? "blur-sm" : ""}`}
            >
              {userNames.map((name, i) => (
                <span key={name}>
                  {getDisplayName(name, settings)}
                  {i < userNames.length - 1 && " & "}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Messages */}
          {settings.metrics.totalMessages && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-1`}>
                Messages
              </div>
              <div className={`text-3xl font-bold ${theme.metricCardAccent}`}>
                {formatNumber(totalMessages)}
              </div>
            </div>
          )}

          {/* Response Time Per User */}
          {settings.metrics.responseTimePerUser && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-2`}>
                Reply Time
              </div>
              <div className="flex justify-around">
                {userNames.map((name, i) => (
                  <div key={name} className="text-center">
                    <div className={`text-xs ${theme.metricCardText} mb-1 ${settings.blurNames ? "blur-sm" : ""}`}>
                      {getDisplayName(name, settings)}
                    </div>
                    <div className={`text-lg font-bold ${theme.metricCardAccent}`}>
                      {formatTime(avgReplyTimes[i])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance Score */}
          {settings.metrics.balanceScore && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-2`}>
                Balance
              </div>
              <div className="flex justify-around">
                {userNames.map((name, i) => (
                  <div key={name} className="text-center">
                    <div className={`text-xs ${theme.metricCardText} mb-1 ${settings.blurNames ? "blur-sm" : ""}`}>
                      {getDisplayName(name, settings)}
                    </div>
                    <div className={`text-xl font-bold ${theme.metricCardAccent}`}>
                      {balancePercentages[i]}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interest Levels */}
          {settings.metrics.interestLevels && interestLevels.length > 0 && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-2`}>
                Interest
              </div>
              <div className="flex justify-around">
                {userNames.map((name, i) => (
                  <div key={name} className="text-center">
                    <div className={`text-xs ${theme.metricCardText} mb-1 ${settings.blurNames ? "blur-sm" : ""}`}>
                      {getDisplayName(name, settings)}
                    </div>
                    <div className={`text-xl font-bold ${theme.metricCardAccent}`}>
                      {interestLevels[i]}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Emojis */}
          {settings.metrics.topEmojis && topEmojis.length > 0 && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-2`}>
                Top Emojis
              </div>
              <div className="text-2xl text-center flex justify-center gap-1">
                {topEmojis.map((emoji, i) => (
                  <span key={i}>{emoji}</span>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Styles */}
          {settings.metrics.attachmentStyles && Object.keys(attachmentStyles).length > 0 && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-2`}>
                Attachment
              </div>
              <div className="flex justify-around">
                {userNames.map((name) => {
                  const style = attachmentStyles[name];
                  if (!style) return null;
                  return (
                    <div key={name} className="text-center">
                      <div className={`text-xs ${theme.metricCardText} mb-1 ${settings.blurNames ? "blur-sm" : ""}`}>
                        {getDisplayName(name, settings)}
                      </div>
                      <div className={`text-sm font-bold ${theme.metricCardAccent}`}>
                        {style.primaryStyle}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Relationship Health */}
          {settings.metrics.relationshipHealth && healthScore > 0 && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-1`}>
                Health
              </div>
              <div className={`text-3xl font-bold ${theme.metricCardAccent}`}>
                {healthScore}/100
              </div>
            </div>
          )}

          {/* Red Flags */}
          {settings.metrics.redFlags && (
            <div className={`${theme.metricCardBg} rounded-2xl p-4 shadow-sm flex flex-col justify-center min-h-[80px]`}>
              <div className={`text-xs font-medium ${theme.metricCardText} uppercase tracking-wider mb-1`}>
                Red Flags
              </div>
              <div className={`text-2xl font-bold ${theme.metricCardAccent}`}>
                {redFlagsCount === 0 ? "✓ None" : `${redFlagsCount} found`}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Branding */}
        <div className={`text-center mt-4 text-sm drop-shadow-sm ${settings.theme === "light" ? "text-neutral-600" : "text-white/90"}`}>
          💕 chemistrycheck.vercel.app
        </div>
      </div>
    );
  }
);

ScorecardPreview.displayName = "ScorecardPreview";
