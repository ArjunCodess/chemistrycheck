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
        className={`${theme.background} w-full flex flex-col`}
        style={{
          padding: "5%",
          fontSize: "clamp(8px, 1.5vw, 14px)",
          borderRadius: "2em",
        }}
      >
        {/* Header with Chemistry Score */}
        {settings.metrics.chemistryScore && (
          <div
            className={`${theme.cardBg} text-center shadow-sm flex flex-col justify-center`}
            style={{
              padding: "5%",
              marginBottom: "3%",
              borderRadius: "1.5em",
            }}
          >
            <div
              className={`font-medium ${theme.secondaryText} uppercase tracking-wider`}
              style={{ fontSize: "1em", marginBottom: "0.5em" }}
            >
              Chemistry Score
            </div>
            <div
              className={`font-bold ${theme.accent}`}
              style={{ fontSize: "5em", lineHeight: 1 }}
            >
              {chemistryScore}%
            </div>
            <div
              className="flex justify-center"
              style={{ marginTop: "0.75em", fontSize: "1.8em", gap: "0.2em" }}
            >
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
              className={`${theme.primaryText} ${settings.blurNames ? "blur-sm" : ""}`}
              style={{ marginTop: "0.75em", fontSize: "1.25em" }}
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
        <div
          className="grid grid-cols-2"
          style={{ gap: "2.5%" }}
        >
          {/* Total Messages */}
          {settings.metrics.totalMessages && (
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.25em" }}
              >
                Messages
              </div>
              <div
                className={`font-bold ${theme.metricCardAccent}`}
                style={{ fontSize: "2.5em" }}
              >
                {formatNumber(totalMessages)}
              </div>
            </div>
          )}

          {/* Response Time Per User */}
          {settings.metrics.responseTimePerUser && (
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.5em" }}
              >
                Reply Time
              </div>
              <div className="flex justify-around">
                {userNames.map((name, i) => (
                  <div key={name} className="text-center">
                    <div
                      className={`${theme.metricCardText} ${settings.blurNames ? "blur-sm" : ""}`}
                      style={{ fontSize: "0.75em", marginBottom: "0.25em" }}
                    >
                      {getDisplayName(name, settings)}
                    </div>
                    <div
                      className={`font-bold ${theme.metricCardAccent}`}
                      style={{ fontSize: "1.5em" }}
                    >
                      {formatTime(avgReplyTimes[i])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance Score */}
          {settings.metrics.balanceScore && (
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.5em" }}
              >
                Balance
              </div>
              <div className="flex justify-around">
                {userNames.map((name, i) => (
                  <div key={name} className="text-center">
                    <div
                      className={`${theme.metricCardText} ${settings.blurNames ? "blur-sm" : ""}`}
                      style={{ fontSize: "0.75em", marginBottom: "0.25em" }}
                    >
                      {getDisplayName(name, settings)}
                    </div>
                    <div
                      className={`font-bold ${theme.metricCardAccent}`}
                      style={{ fontSize: "1.75em" }}
                    >
                      {balancePercentages[i]}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interest Levels */}
          {settings.metrics.interestLevels && interestLevels.length > 0 && (
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.5em" }}
              >
                Interest
              </div>
              <div className="flex justify-around">
                {userNames.map((name, i) => (
                  <div key={name} className="text-center">
                    <div
                      className={`${theme.metricCardText} ${settings.blurNames ? "blur-sm" : ""}`}
                      style={{ fontSize: "0.75em", marginBottom: "0.25em" }}
                    >
                      {getDisplayName(name, settings)}
                    </div>
                    <div
                      className={`font-bold ${theme.metricCardAccent}`}
                      style={{ fontSize: "1.75em" }}
                    >
                      {interestLevels[i]}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Emojis */}
          {settings.metrics.topEmojis && topEmojis.length > 0 && (
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.5em" }}
              >
                Top Emojis
              </div>
              <div
                className="text-center flex justify-center"
                style={{ fontSize: "1.8em", gap: "0.2em" }}
              >
                {topEmojis.map((emoji, i) => (
                  <span key={i}>{emoji}</span>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Styles */}
          {settings.metrics.attachmentStyles && Object.keys(attachmentStyles).length > 0 && (
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.5em" }}
              >
                Attachment
              </div>
              <div className="flex justify-around">
                {userNames.map((name) => {
                  const style = attachmentStyles[name];
                  if (!style) return null;
                  return (
                    <div key={name} className="text-center">
                      <div
                        className={`${theme.metricCardText} ${settings.blurNames ? "blur-sm" : ""}`}
                        style={{ fontSize: "0.75em", marginBottom: "0.25em" }}
                      >
                        {getDisplayName(name, settings)}
                      </div>
                      <div
                        className={`font-bold ${theme.metricCardAccent}`}
                        style={{ fontSize: "1em" }}
                      >
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
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.25em" }}
              >
                Health
              </div>
              <div
                className={`font-bold ${theme.metricCardAccent}`}
                style={{ fontSize: "2.5em" }}
              >
                {healthScore}/100
              </div>
            </div>
          )}

          {/* Red Flags */}
          {settings.metrics.redFlags && (
            <div
              className={`${theme.metricCardBg} shadow-sm flex flex-col justify-center`}
              style={{ padding: "4%", borderRadius: "1em" }}
            >
              <div
                className={`font-medium ${theme.metricCardText} uppercase tracking-wider`}
                style={{ fontSize: "0.85em", marginBottom: "0.25em" }}
              >
                Red Flags
              </div>
              <div
                className={`font-bold ${theme.metricCardAccent}`}
                style={{ fontSize: "2em" }}
              >
                {redFlagsCount === 0 ? "✓ None" : `${redFlagsCount} found`}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Branding */}
        <div
          className={`text-center drop-shadow-sm ${settings.theme === "light" ? "text-neutral-600" : "text-white/90"}`}
          style={{
            marginTop: "2em",
            paddingTop: "2em",
            fontSize: "1em",
            position: "relative",
            zIndex: 10,
          }}
        >
          💕 chemistrycheck.vercel.app
        </div>
      </div>
    );
  }
);

ScorecardPreview.displayName = "ScorecardPreview";
