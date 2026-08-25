"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

import { patchCommunityRoomScreenSettingsAction } from "@/actions/community-host-dashboard";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function CommunityDisplayHostClient({ hostSlug }: { hostSlug: string }) {
  const searchParams = useSearchParams();
  const communityId = searchParams.get("communityId")?.trim() ?? "";

  const [background, setBackground] = useState("");
  const [moneyFor, setMoneyFor] = useState("");
  const [showLatest, setShowLatest] = useState(false);
  const [hideProgress, setHideProgress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      setMsg(
        "Saved. Viewers on the community channel may take a moment to refresh."
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [communityId, background, moneyFor, showLatest, hideProgress]);

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

      <div className="mt-6 max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bg">Background image URL</Label>
          <Input
            id="bg"
            value={background}
            onChange={e => setBackground(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf">Money for / goal label</Label>
          <Input
            id="mf"
            value={moneyFor}
            onChange={e => setMoneyFor(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="sla"
            checked={showLatest}
            onCheckedChange={setShowLatest}
          />
          <Label htmlFor="sla">Show latest amount</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="hp"
            checked={hideProgress}
            onCheckedChange={setHideProgress}
          />
          <Label htmlFor="hp">Hide progress bar amount</Label>
        </div>

        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        {msg ? <p className="text-muted-foreground text-sm">{msg}</p> : null}
      </div>
    </>
  );
}
