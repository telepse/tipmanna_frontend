"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  createHostPlaylistAction,
  deleteHostPlaylistAction,
  listHostPlaylistsAction,
  type HostPlaylistItemInput,
  type HostPlaylistSummary,
} from "@/actions/host-playlist";
import { getMyCommunitiesAction } from "@/actions/communities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RootState } from "@/redux/store";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { listMyVideosForVideoRequestsAction } from "@/actions/video-requests";

const MIN_ITEMS = 3;
const MAX_ITEMS = 10;

type ChannelOption = {
  id: string;
  title: string;
  url: string;
  eventName: string;
};

export function HostPlaylistsClient() {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const [playlists, setPlaylists] = useState<HostPlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [communities, setCommunities] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"standard" | "community">("standard");
  const [communityId, setCommunityId] = useState<string>("");
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await listHostPlaylistsAction();
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load playlists");
        setPlaylists([]);
        return;
      }
      setPlaylists(res.data.playlists ?? []);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dialogOpen || !userId) return;
    void (async () => {
      const [videosRes, commRes] = await Promise.all([
        listMyVideosForVideoRequestsAction(),
        getMyCommunitiesAction(),
      ]);
      if (videosRes.success && videosRes.data) {
        const events =
          (
            videosRes.data as {
              events?: Array<{
                eventName: string;
                channels: Array<{ id: string; title: string; url: string }>;
              }>;
            }
          ).events ?? [];
        const opts: ChannelOption[] = [];
        for (const ev of events) {
          for (const ch of ev.channels ?? []) {
            opts.push({
              id: ch.id,
              title: ch.title,
              url: ch.url,
              eventName: ev.eventName,
            });
          }
        }
        setChannels(opts);
      }
      if (commRes.success && commRes.data) {
        const raw = commRes.data as {
          owned?: Array<{ id: string; name: string }>;
        };
        setCommunities(raw.owned ?? []);
      }
    })();
  }, [dialogOpen, userId]);

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds(prev => {
      if (prev.includes(channelId)) {
        return prev.filter(id => id !== channelId);
      }
      if (prev.length >= MAX_ITEMS) {
        toast.info(`Maximum ${MAX_ITEMS} videos per playlist`);
        return prev;
      }
      return [...prev, channelId];
    });
  };

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (selectedChannelIds.length < MIN_ITEMS) return false;
    if (kind === "community" && !communityId.trim()) return false;
    return true;
  }, [communityId, kind, name, selectedChannelIds.length]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setKind("standard");
    setCommunityId("");
    setSelectedChannelIds([]);
  };

  const onCreate = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const items: HostPlaylistItemInput[] = selectedChannelIds.map(
        (eventChannelId, index) => ({
          eventChannelId,
          sortOrder: index,
        })
      );
      const res = await createHostPlaylistAction({
        name: name.trim(),
        description: description.trim() || null,
        kind,
        communityId: kind === "community" ? communityId : null,
        items,
      });
      if (!res.success) {
        toast.error(res.message ?? "Could not create playlist");
        return;
      }
      toast.success("Playlist created");
      setDialogOpen(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this playlist?")) return;
    const res = await deleteHostPlaylistAction(id);
    if (!res.success) {
      toast.error(res.message ?? "Could not delete playlist");
      return;
    }
    toast.success("Playlist deleted");
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Curate 3–10 videos into shareable playlists. Community playlists are
          visible to members of the selected community.
        </p>
        <Button
          type="button"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 size-4" />
          New playlist
        </Button>
      </div>

      {playlists.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No playlists yet. Create one to share a curated set of videos.
        </p>
      ) : (
        <ul className="space-y-3">
          {playlists.map(pl => {
            const thumbChannel = pl.items?.[0]?.url;
            const videoId = thumbChannel
              ? extractYoutubeID(thumbChannel)
              : null;
            const thumb = videoId
              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
              : pl.bannerUrl;
            return (
              <li
                key={pl.id}
                className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="aspect-video w-full max-w-[140px] rounded-md object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    href={`/playlist/${pl.id}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {pl.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {pl.videoCount} videos · {pl.pageVisitCount} visits ·{" "}
                    {pl.totalTipCount} tips
                    {pl.kind === "community" && pl.communityName
                      ? ` · Community: ${pl.communityName}`
                      : null}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onDelete(pl.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pl-name">Name</Label>
              <Input
                id="pl-name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-desc">Description</Label>
              <Textarea
                id="pl-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={kind}
                onValueChange={v => setKind(v as "standard" | "community")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === "community" ? (
              <div className="space-y-1.5">
                <Label>Community</Label>
                <Select
                  value={communityId}
                  onValueChange={setCommunityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select community" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map(c => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>
                Videos ({selectedChannelIds.length}/{MAX_ITEMS}, min {MIN_ITEMS}
                )
              </Label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {channels.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No eligible videos found.
                  </p>
                ) : (
                  channels.map(ch => (
                    <label
                      key={ch.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChannelIds.includes(ch.id)}
                        onChange={() => toggleChannel(ch.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 text-sm">
                        <span className="font-medium">{ch.title}</span>
                        <span className="text-muted-foreground block text-xs">
                          {ch.eventName}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button
              type="button"
              disabled={!canSubmit || saving}
              onClick={() => void onCreate()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create playlist"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
