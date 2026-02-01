"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ScorecardSettings,
  ThemeId,
  NameDisplayOption,
} from "./types";
import { SCORECARD_THEMES } from "./scorecard-themes";

interface ScorecardSettingsPanelProps {
  settings: ScorecardSettings;
  onSettingsChange: (settings: ScorecardSettings) => void;
  userNames: string[];
}

export function ScorecardSettingsPanel({
  settings,
  onSettingsChange,
  userNames,
}: ScorecardSettingsPanelProps) {
  const updateSettings = (updates: Partial<ScorecardSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  const updateMetric = (key: keyof ScorecardSettings["metrics"], value: boolean) => {
    onSettingsChange({
      ...settings,
      metrics: { ...settings.metrics, [key]: value },
    });
  };

  const updateCustomName = (originalName: string, customName: string) => {
    onSettingsChange({
      ...settings,
      customNames: { ...settings.customNames, [originalName]: customName },
    });
  };

  return (
    <div className="space-y-4">
      {/* Theme, Name Display, Blur */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Theme</Label>
          <Select
            value={settings.theme}
            onValueChange={(value: ThemeId) => updateSettings({ theme: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(SCORECARD_THEMES).map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Names</Label>
          <Select
            value={settings.nameDisplay}
            onValueChange={(value: NameDisplayOption) =>
              updateSettings({ nameDisplay: value })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="first">First</SelectItem>
              <SelectItem value="initials">Initials</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Blur Names</Label>
          <div className="h-9 flex items-center">
            <Switch
              checked={settings.blurNames}
              onCheckedChange={(checked: boolean) => updateSettings({ blurNames: checked })}
            />
          </div>
        </div>
      </div>

      {/* Custom Names Input */}
      {settings.nameDisplay === "custom" && (
        <div className="space-y-2">
          {userNames.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 truncate">
                {name}:
              </span>
              <Input
                placeholder="Custom"
                value={settings.customNames[name] || ""}
                onChange={(e) => updateCustomName(name, e.target.value)}
                className="flex-1 h-8"
              />
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Metrics Toggle - Compact Grid */}
      <div className="space-y-2">
        <Label className="text-sm">Metrics</Label>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="metric-chemistry" className="text-xs font-normal">
              Chemistry
            </Label>
            <Switch
              id="metric-chemistry"
              checked={settings.metrics.chemistryScore}
              onCheckedChange={(checked: boolean) => updateMetric("chemistryScore", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-messages" className="text-xs font-normal">
              Messages
            </Label>
            <Switch
              id="metric-messages"
              checked={settings.metrics.totalMessages}
              onCheckedChange={(checked: boolean) => updateMetric("totalMessages", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-reply-user" className="text-xs font-normal">
              Reply Time
            </Label>
            <Switch
              id="metric-reply-user"
              checked={settings.metrics.responseTimePerUser}
              onCheckedChange={(checked: boolean) => updateMetric("responseTimePerUser", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-balance" className="text-xs font-normal">
              Balance
            </Label>
            <Switch
              id="metric-balance"
              checked={settings.metrics.balanceScore}
              onCheckedChange={(checked: boolean) => updateMetric("balanceScore", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-interest" className="text-xs font-normal">
              Interest
            </Label>
            <Switch
              id="metric-interest"
              checked={settings.metrics.interestLevels}
              onCheckedChange={(checked: boolean) => updateMetric("interestLevels", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-emojis" className="text-xs font-normal">
              Emojis
            </Label>
            <Switch
              id="metric-emojis"
              checked={settings.metrics.topEmojis}
              onCheckedChange={(checked: boolean) => updateMetric("topEmojis", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-attachment" className="text-xs font-normal">
              Attachment
            </Label>
            <Switch
              id="metric-attachment"
              checked={settings.metrics.attachmentStyles}
              onCheckedChange={(checked: boolean) => updateMetric("attachmentStyles", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-health" className="text-xs font-normal">
              Health
            </Label>
            <Switch
              id="metric-health"
              checked={settings.metrics.relationshipHealth}
              onCheckedChange={(checked: boolean) => updateMetric("relationshipHealth", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="metric-flags" className="text-xs font-normal">
              Red Flags
            </Label>
            <Switch
              id="metric-flags"
              checked={settings.metrics.redFlags}
              onCheckedChange={(checked: boolean) => updateMetric("redFlags", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
