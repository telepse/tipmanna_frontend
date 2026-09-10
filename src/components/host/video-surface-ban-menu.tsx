"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Loader2, Lock } from "lucide-react";
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

const SURFACE_OPTIONS: Array<{ value: VideoBanSurface; label: string }> = [
  { value: "tv", label: "TV" },
  { value: "explore", label: "Explore" },
  { value: "discover", label: "Discover" },
  { value: "internal_search", label: "Internal search" },
  { value: "external_search", label: "External search" },
];

type Props = {
  eventId: string;
  channelId: string;
  disabled?: boolean;
};

export function VideoSurfaceBanMenu({ eventId, channelId, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [superadminLocked, setSuperadminLocked] = useState(false);
  const [selected, setSelected] = useState<VideoBanSurface[]>([]);

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
    setSelected(prev =>
      prev.includes(surface)
        ? prev.filter(s => s !== surface)
        : [...prev, surface]
    );
  };

  const save = async () => {
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
          className="gap-1"
        >
          {superadminLocked ? (
            <Lock className="size-3.5" />
          ) : (
            <Ban className="size-3.5" />
          )}
          {activeCount ? `Banned (${activeCount})` : "Surface bans"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 p-3"
      >
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : superadminLocked ? (
          <p className="text-muted-foreground text-sm">
            Locked by a superadmin ban. Contact support to change.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Hide video from:</p>
            <div className="space-y-2">
              {SURFACE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
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
