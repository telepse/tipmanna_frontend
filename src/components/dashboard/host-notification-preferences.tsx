"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "@/actions/notifications";
import type { RootState } from "@/redux/store";

const CATEGORIES = [
  { key: "wallet", label: "Wallet" },
  { key: "tip_payment", label: "Tips received" },
  { key: "payout", label: "Payouts" },
  { key: "community", label: "Community" },
  { key: "tv_enforcement", label: "TV schedule" },
  { key: "tv_reminder", label: "TV reminders" },
  { key: "system", label: "System announcements" },
] as const;

const CHANNELS = ["in_app", "push", "email"] as const;

export function HostNotificationPreferences() {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void getNotificationPreferencesAction()
      .then(res => {
        if (!res.success || !res.data) return;
        const map: Record<string, boolean> = {};
        for (const p of res.data.preferences ?? []) {
          map[`${p.categoryKey}:${p.channel}`] = p.enabled;
        }
        setPrefs(map);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const setPref = async (
    categoryKey: string,
    channel: string,
    enabled: boolean
  ) => {
    if (!userId) return;
    const key = `${categoryKey}:${channel}`;
    setPrefs(prev => ({ ...prev, [key]: enabled }));
    await updateNotificationPreferencesAction([
      { categoryKey, channel, enabled },
    ]);
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-6">
      {CATEGORIES.map(cat => (
        <div
          key={cat.key}
          className="space-y-3 rounded-lg border p-4"
        >
          <h3 className="font-medium">{cat.label}</h3>
          {CHANNELS.map(ch => {
            const key = `${cat.key}:${ch}`;
            return (
              <div
                key={key}
                className="flex items-center justify-between"
              >
                <Label htmlFor={key}>{ch.replace("_", " ")}</Label>
                <Switch
                  id={key}
                  checked={prefs[key] ?? true}
                  onCheckedChange={v => void setPref(cat.key, ch, v)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
