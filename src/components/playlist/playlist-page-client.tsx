"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Play, Share2, UserRound } from "lucide-react";
import { toast } from "react-toastify";

import type { HostPlaylistSummary } from "@/actions/host-playlist";
import { postPlaylistVisitAction } from "@/actions/host-playlist";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import { Button } from "@/components/ui/button";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { useOpenContentWithReturn } from "@/hooks/use-open-content-with-return";
import { copyShareUrl } from "@/lib/copy-share-url";
import { cn } from "@/lib/utils";

type Props = {
  playlist: HostPlaylistSummary;
  locked?: boolean;
  requiresMembership?: boolean;
};

function playlistThumbnail(
  item: HostPlaylistSummary["items"] extends infer T
    ? T extends Array<infer U>
      ? U
      : never
    : never
) {
  const videoId = extractYoutubeID(item.url);
  return videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : "/default-event-image.jpg";
}

export function PlaylistPageClient({
  playlist,
  locked = false,
  requiresMembership = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const openContent = useOpenContentWithReturn();
  const [joinOpen, setJoinOpen] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const items = playlist.items ?? [];
  const bannerSrc =
    playlist.bannerUrl?.trim() ||
    (items[0] ? playlistThumbnail(items[0]) : null);

  useEffect(() => {
    void postPlaylistVisitAction(
      playlist.id,
      pathname || `/playlist/${playlist.id}`
    );
  }, [pathname, playlist.id]);

  const playItem = useCallback(
    (index: number, watchAll = false) => {
      const item = items[index];
      if (!item) return;
      if (locked) {
        setJoinOpen(true);
        return;
      }
      setPlayingIndex(index);
      openContent({
        eventId: item.event.id,
        channelId: item.eventChannelId,
        returnTo: pathname || `/playlist/${playlist.id}`,
        label: `Back to ${playlist.name}`,
        ...(watchAll ? { playlistId: playlist.id } : {}),
      });
    },
    [items, locked, openContent, pathname, playlist.id, playlist.name]
  );

  const playAll = useCallback(() => {
    if (locked) {
      setJoinOpen(true);
      return;
    }
    if (items.length === 0) {
      toast.info("This playlist has no videos");
      return;
    }
    playItem(0, true);
  }, [items.length, locked, playItem]);

  const metricsLine = useMemo(() => {
    const parts = [
      `${playlist.videoCount} videos`,
      `${playlist.pageVisitCount} visits`,
      `${playlist.totalTipCount} tips`,
      `${playlist.totalEncounters} seen`,
      `${playlist.totalSaves} saves`,
      `${playlist.totalComments} comments`,
    ];
    return parts.join(" · ");
  }, [playlist]);

  const joinHref =
    playlist.communityId != null
      ? exploreCommunityJoinHref(playlist.communityId)
      : null;

  const sharePlaylist = useCallback(async () => {
    const path = pathname || `/playlist/${playlist.id}`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
        : path;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: playlist.name, url });
        return;
      } catch {
        return;
      }
    }
    await copyShareUrl(url);
    toast.success("Playlist link copied");
  }, [pathname, playlist.id, playlist.name]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-6">
      {bannerSrc ? (
        <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-neutral-100">
          <Image
            src={bannerSrc}
            alt=""
            fill
            className="object-cover"
            unoptimized={bannerSrc.startsWith("http")}
          />
        </div>
      ) : null}

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{playlist.name}</h1>
        {playlist.description ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {playlist.description}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">{metricsLine}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={buildCreatorProfileSharePath(playlist.host.username)}
            className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            <UserRound className="size-4" />@{playlist.host.username}
          </Link>
          {playlist.kind === "community" && playlist.communityName ? (
            <>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => setJoinOpen(true)}
              >
                c {playlist.communityName}
              </button>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={playAll}
            disabled={locked ? false : items.length === 0}
          >
            <Play className="mr-2 size-4" />
            {locked ? "Join to play" : "Play all"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void sharePlaylist()}
          >
            <Share2 className="mr-2 size-4" />
            Share
          </Button>
        </div>
      </header>

      {locked && requiresMembership ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-950">Members only</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Join {playlist.communityName ?? "this community"} to view and play
            videos in this playlist.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setJoinOpen(true)}
          >
            Join community
          </Button>
        </div>
      ) : null}

      <ol className="space-y-2">
        {!locked
          ? items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => playItem(index)}
                  className={cn(
                    "hover:bg-muted/40 flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors",
                    playingIndex === index && "border-primary bg-primary/5"
                  )}
                >
                  <span className="text-muted-foreground w-6 shrink-0 text-center text-sm">
                    {index + 1}
                  </span>
                  <img
                    src={playlistThumbnail(item)}
                    alt=""
                    className="aspect-video w-24 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {item.numOfTips} tips · {item.event.eventName}
                    </span>
                  </span>
                </button>
              </li>
            ))
          : null}
      </ol>

      {playlist.communityId && joinHref ? (
        <JoinCommunityModal
          open={joinOpen}
          onOpenChange={setJoinOpen}
          communityId={playlist.communityId}
          signInRedirectPath={joinHref}
          title={`Join ${playlist.communityName ?? "community"}`}
        />
      ) : null}
    </div>
  );
}
