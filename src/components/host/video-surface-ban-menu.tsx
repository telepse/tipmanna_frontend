"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Crown, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getHostVideoSurfaceBansAction,
  setHostVideoSurfaceBansAction,
  type VideoBanSurface,
} from "@/actions/video-surface-ban";
import { HOST_VIDEO_SURFACE_BAN_OPTIONS } from "@/lib/host-video-surface-ban-labels";

type Props = {
  eventId: string;
  channelId: string;
  disabled?: boolean;
  hasActivePremium?: boolean;
};

export function VideoSurfaceBanMenu({
  eventId,
  channelId,
  disabled,
  hasActivePremium = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [superadminLocked, setSuperadminLocked] = useState(false);
  const [selected, setSelected] = useState<VideoBanSurface[]>([]);

  const premiumLocked = !hasActivePremium;

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHostVideoSurfaceBansAction(eventId, channelId);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Could not load surface bans");
        return;
      }
      setSelected(result.data.bannedSurfaces);
      setSuperadminLocked(result.data.superadminLocked);
    } finally {
      setLoading(false);
    }
  }, [eventId, channelId]);

  useEffect(() => {
    if (open) void loadState();
  }, [open, loadState]);

  const toggleSurface = (surface: VideoBanSurface) => {
    if (premiumLocked) return;
    setSelected(prev =>
      prev.includes(surface)
        ? prev.filter(s => s !== surface)
        : [...prev, surface]
    );
  };

  const save = async () => {
    if (premiumLocked) {
      toast.error("Host Premium is required to manage surface bans");
      return;
    }
    setSaving(true);
    try {
      const result = await setHostVideoSurfaceBansAction(
        eventId,
        channelId,
        selected
      );
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Could not save surface bans");
        return;
      }
      setSelected(result.data.bannedSurfaces);
      setSuperadminLocked(result.data.superadminLocked);
      toast.success(
        result.data.bannedSurfaces.length
          ? "Surface bans updated"
          : "Surface bans cleared"
      );
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const activeCount = selected.length;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={activeCount ? "destructive" : "outline"}
          disabled={disabled}
          className="relative gap-1"
          title={
            premiumLocked ? "Host Premium required for surface bans" : undefined
          }
        >
          {premiumLocked ? (
            <Crown className="text-primary size-3.5" />
          ) : superadminLocked ? (
            <Lock className="size-3.5" />
          ) : (
            <Ban className="size-3.5" />
          )}
          {activeCount ? `Banned (${activeCount})` : "Surface bans"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-3"
      >
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : premiumLocked ? (
          <p className="text-muted-foreground text-sm">
            Host Premium is required to hide videos from Tipmanna surfaces.
          </p>
        ) : superadminLocked ? (
          <p className="text-muted-foreground text-sm">
            Locked by an admin ban. Contact support to change.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Hide video from:</p>
            <div className="space-y-2">
              {HOST_VIDEO_SURFACE_BAN_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-start gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggleSurface(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
