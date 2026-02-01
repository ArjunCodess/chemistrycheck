"use client";

import { useState, useRef } from "react";
import { ChatStats } from "@/types";
import { ScorecardSettings, DEFAULT_SETTINGS } from "./types";
import { ScorecardSettingsPanel } from "./scorecard-settings";
import { ScorecardPreview } from "./scorecard-preview";
import { ScorecardExport } from "./scorecard-export";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ScorecardProps {
  stats: ChatStats;
  analysisName?: string;
}

export function Scorecard({ stats, analysisName }: ScorecardProps) {
  const [settings, setSettings] = useState<ScorecardSettings>(DEFAULT_SETTINGS);
  const cardRef = useRef<HTMLDivElement>(null);

  const userNames = Object.keys(stats.messagesByUser || {}).slice(0, 2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Settings Panel + Export */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Customize your scorecard appearance and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ScorecardSettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
              userNames={userNames}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>Download or copy your scorecard to share</CardDescription>
          </CardHeader>
          <CardContent>
            <ScorecardExport
              cardRef={cardRef}
              analysisName={analysisName}
            />
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your scorecard will look</CardDescription>
        </CardHeader>
        <CardContent>
          <ScorecardPreview
            ref={cardRef}
            stats={stats}
            settings={settings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
