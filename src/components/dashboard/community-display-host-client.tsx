"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getCommunityRoomScreenSettingsAction,
  patchCommunityRoomScreenSettingsAction,
} from "@/actions/community-host-dashboard";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCommunityDisplayUpdated } from "@/hooks/use-community-display-updated";
import { mapCommunityRoomScreenSettings } from "@/lib/community-room-display";

export function CommunityDisplayHostClient({ hostSlug }: { hostSlug: string }) {
  const searchParams = useSearchParams();
  const communityId = searchParams.get("communityId")?.trim() ?? "";

  const [background, setBackground] = useState("");
  const [moneyFor, setMoneyFor] = useState("");
  const [showLatest, setShowLatest] = useState(false);
  const [hideProgress, setHideProgress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const applySettings = useCallback((raw: Record<string, unknown>) => {
    const mapped = mapCommunityRoomScreenSettings(raw);
    setBackground(mapped.background);
    setMoneyFor(mapped.moneyFor);
    setShowLatest(mapped.showLatest);
    setHideProgress(mapped.hideProgressAmount);
  }, []);

  const reloadSettings = useCallback(async () => {
    if (!communityId) return;
    setLoadingSettings(true);
    setLoadError(null);
    try {
      const res = await getCommunityRoomScreenSettingsAction(communityId);
      if (!res.success) {
        throw new Error(res.message ?? res.error ?? "Could not load settings");
      }
      applySettings((res.data ?? res) as Record<string, unknown>);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load settings");
    } finally {
      setLoadingSettings(false);
    }
  }, [applySettings, communityId]);

  useEffect(() => {
    if (!communityId) return;
    void reloadSettings();
  }, [communityId, reloadSettings]);

  useCommunityDisplayUpdated(communityId, () => {
    void reloadSettings();
  });

  const save = useCallback(async () => {
    if (!communityId) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await patchCommunityRoomScreenSettingsAction(communityId, {
        background: background || undefined,
        moneyFor: moneyFor || undefined,
        showLatest,
        hideProgressAmount: hideProgress,
      });
      if (!res.success) {
        throw new Error(res.message ?? res.error ?? "Save failed");
      }
      applySettings((res.data ?? res) as Record<string, unknown>);
      setMsg("Saved. Community room display updated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    communityId,
    background,
    moneyFor,
    showLatest,
    hideProgress,
    applySettings,
  ]);

  const backHref = `/host/${hostSlug}/host-community`;

  if (!communityId) {
    return (
      <>
        <DashboardHeading
          title="Community room display"
          subtitle="Select a community from Community management."
        />
        <Button
          asChild
          variant="outline"
        >
          <Link href={backHref}>Back</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <DashboardHeading
        title="Community room display"
        subtitle="Background and progress bar defaults for the community room (stored on the community)."
      />
      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-2"
      >
        <Link href={backHref}>Back</Link>
      </Button>

      {loadingSettings ? (
        <p className="text-muted-foreground mt-6 text-sm">
          Loading saved settings…
        </p>
      ) : null}
      {loadError ? (
        <p className="text-destructive mt-6 text-sm">{loadError}</p>
      ) : null}

      <div className="mt-6 max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bg">Background image URL</Label>
          <Input
            id="bg"
            value={background}
            onChange={e => setBackground(e.target.value)}
            placeholder="https://..."
            disabled={loadingSettings || saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf">Money for / goal label</Label>
          <Input
            id="mf"
            value={moneyFor}
            onChange={e => setMoneyFor(e.target.value)}
            disabled={loadingSettings || saving}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="sla"
            checked={showLatest}
            onCheckedChange={setShowLatest}
            disabled={loadingSettings || saving}
          />
          <Label htmlFor="sla">Show latest amount</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="hp"
            checked={hideProgress}
            onCheckedChange={setHideProgress}
            disabled={loadingSettings || saving}
          />
          <Label htmlFor="hp">Hide progress bar amount</Label>
        </div>

        <Button
          type="button"
          disabled={saving || loadingSettings}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        {msg ? <p className="text-muted-foreground text-sm">{msg}</p> : null}
      </div>
    </>
  );
}
