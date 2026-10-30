"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronDown,
  ChevronsUp,
  MessageCircle,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

import { getExploreChannelMetricsAction } from "@/actions/contents";
import { CommentDrawer } from "@/components/events/comment-drawer";
import { Button } from "@/components/ui/button";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import { formatPlaylistClock } from "@/lib/tv/playlistDisplay";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import {
  getExploreTvFeedMuted,
  setExploreTvFeedMuted,
  subscribeExploreTvFeedMuted,
} from "@/lib/explore-tv-feed-mute";
import type { VideoPlayerRef } from "@/components/events/video-player";
import type { RoomCharacter } from "@/types";

const VideoPlayer = dynamic(() => import("@/components/events/video-player"), {
  ssr: false,
});

const THUMB_MS = 5000;
const PREPLAY_SEC = 15;

type ChannelLike = {
  id: string;
  url?: string;
  title?: string;
  description?: string | null;
  hostName?: string;
  username?: string;
  numOfTips?: number;
  eventId?: string;
};

export type TvExploreScheduleCardProps = {
  item: {
    channel?: ChannelLike;
    blockTitle?: string;
    segmentKind?: string;
    duration?: number;
    axisStartSec?: number;
  };
  index: number;
  cardKey?: string;
  broadcastEpoch?: number;
  isActiveCard?: boolean;
  cardRef?: (node: HTMLDivElement | null) => void;
  onPlayInExplore: (target: ExploreFeedOpenTarget) => void;
  onTip: (eventId: string, channelId: string) => void;
  /** Load tip catalog before opening comments (parent owns drawer state). */
  onPrepareTip?: (eventId: string, channelId: string) => void;
  tippingCharacters?: RoomCharacter[];
  onContinueToTip?: () => void;
  thumbUrl: (url?: string) => string | null;
};

type PreplayPhase = "thumb" | "preplay" | "ended";

export function TvExploreScheduleCard({
  item,
  broadcastEpoch,
  isActiveCard = false,
  cardRef,
  onPlayInExplore,
  onTip,
  onPrepareTip,
  tippingCharacters,
  onContinueToTip,
  thumbUrl,
}: TvExploreScheduleCardProps) {
  const ch = item.channel;
  const eventId = ch?.eventId;
  const channelId = ch?.id;
  const url = ch?.url;
  const thumb = thumbUrl(url);
  const title =
    item.blockTitle || ch?.title || ch?.hostName || "Programme slot";
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState<{
    saves: number;
    shares: number;
    comments: number;
    encounters: number;
    views: number;
  } | null>(null);
  const [phase, setPhase] = useState<PreplayPhase>("thumb");
  const [tvMuted, setTvMuted] = useState(getExploreTvFeedMuted);
  const [commentOpen, setCommentOpen] = useState(false);
  const videoRef = useRef<VideoPlayerRef>(null);
  const preplayStartedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const airMs =
    broadcastEpoch != null
      ? broadcastEpoch +
        (typeof item.axisStartSec === "number" ? item.axisStartSec : 0) * 1000
      : null;

  useEffect(() => {
    return subscribeExploreTvFeedMuted(() => {
      setTvMuted(getExploreTvFeedMuted());
    });
  }, []);

  useEffect(() => {
    if (!channelId) return;
    if (isExploreE2eFixturesActiveOnClient()) return;
    let cancelled = false;
    void (async () => {
      const r = await getExploreChannelMetricsAction(channelId);
      if (cancelled || !r.success || !r.data || "restricted" in r.data) return;
      setMetrics({
        saves: r.data.saves ?? 0,
        shares: r.data.shares ?? 0,
        comments: r.data.comments ?? 0,
        encounters: r.data.encounters ?? 0,
        views: r.data.views ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const clearPreplayTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startPreplaySegment = useCallback(() => {
    preplayStartedAtRef.current = Date.now();
    setPhase("preplay");
    clearPreplayTick();
    tickRef.current = setInterval(() => {
      const player = videoRef.current;
      if (!player?.isReady()) return;
      const elapsed = player.getCurrentTime();
      if (elapsed >= PREPLAY_SEC) {
        player.pause();
        clearPreplayTick();
        setPhase("ended");
      }
    }, 250);
  }, [clearPreplayTick]);

  useEffect(() => {
    if (!isActiveCard) {
      clearPreplayTick();
      setPhase("thumb");
      preplayStartedAtRef.current = null;
      return;
    }
    if (phase !== "thumb") return;
    const timer = window.setTimeout(() => {
      startPreplaySegment();
    }, THUMB_MS);
    return () => window.clearTimeout(timer);
  }, [clearPreplayTick, isActiveCard, phase, startPreplaySegment]);

  useEffect(() => () => clearPreplayTick(), [clearPreplayTick]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player?.isReady()) return;
    if (tvMuted) player.mute();
    else player.unmute();
  }, [phase, tvMuted]);

  const handleToggleMute = () => {
    const next = !getExploreTvFeedMuted();
    setExploreTvFeedMuted(next);
    const player = videoRef.current;
    if (player?.isReady()) {
      if (next) player.mute();
      else player.unmute();
    }
  };

  const handleReplay = () => {
    const player = videoRef.current;
    if (!player?.isReady()) {
      startPreplaySegment();
      return;
    }
    player.seekTo(0);
    player.play();
    startPreplaySegment();
  };

  const handleWatchFull = () => {
    if (!channelId || !eventId || !url) return;
    onPlayInExplore({
      videoId: channelId,
      eventId,
      channelSnapshot: ch
        ? {
            ...ch,
            id: channelId,
            url,
            liveStatus: "NOT_LIVE",
            event: { id: eventId },
          }
        : undefined,
    });
  };

  const isNotice =
    item.segmentKind && item.segmentKind !== "regular" && !channelId;

  if (isNotice) {
    return (
      <div className="bg-muted/30 text-muted-foreground rounded-2xl border px-4 py-3 text-sm">
        {title}
      </div>
    );
  }

  if (!channelId || !eventId || !url) {
    return (
      <div className="bg-muted/20 rounded-2xl border px-4 py-3 text-sm">
        {title}
      </div>
    );
  }

  const description = ch?.description?.trim() ?? "";
  const hasLongDescription = description.length > 120;
  const showPlayer = isActiveCard && phase !== "thumb" && url;

  return (
    <>
      <div
        ref={cardRef}
        className="bg-card overflow-hidden rounded-2xl border shadow-sm"
        data-testid="explore-tv-card"
        data-channel-id={channelId}
      >
        <div className="relative aspect-video w-full bg-black">
          {showPlayer ? (
            <VideoPlayer
              ref={videoRef}
              videoUrl={url}
              className="h-full w-full"
              embedMode="chromeless"
              playbackActive={phase === "preplay"}
              initialMuted={tvMuted}
              persistSessionAudio={false}
              disableGlobalAudioUnlock
              suppressLoadingChrome
              loadingBackdropClassName="bg-black"
              showLoadingLabel={false}
              transitionLoadingOverlay={false}
              onVideoLoaded={() => {
                const player = videoRef.current;
                if (!player?.isReady()) return;
                if (tvMuted) player.mute();
                if (phase === "preplay") player.play();
              }}
              onPlayStateChange={playing => {
                if (playing && phase === "preplay" && videoRef.current) {
                  if (tvMuted) videoRef.current.mute();
                }
              }}
              onPlaybackEnded={() => {
                clearPreplayTick();
                setPhase("ended");
              }}
            />
          ) : thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Video
            </div>
          )}
          {airMs != null ? (
            <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
              {formatPlaylistClock(airMs)}
            </span>
          ) : null}
          {isActiveCard && phase !== "thumb" ? (
            <button
              type="button"
              className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white"
              aria-label={tvMuted ? "Unmute TV preview" : "Mute TV preview"}
              onClick={handleToggleMute}
            >
              {tvMuted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </button>
          ) : null}
          {phase === "ended" ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 p-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={handleReplay}
              >
                <RotateCcw className="mr-1 size-4" />
                Replay
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                data-testid="explore-tv-watch-full"
                onClick={handleWatchFull}
              >
                Watch full video
              </Button>
            </div>
          ) : null}
        </div>
        <div className="space-y-2 p-3">
          <p className="line-clamp-2 text-sm leading-snug font-semibold">
            {title}
          </p>
          <p className="text-muted-foreground text-xs">
            {ch?.hostName ?? ch?.username ?? "Host"} · {ch?.numOfTips ?? 0} tips
            {metrics
              ? ` · ${metrics.saves} saves · ${metrics.shares} shares · ${metrics.comments} comments · ${metrics.encounters} encounters`
              : null}
          </p>
          {description ? (
            <div className="text-xs">
              <p className={expanded ? "whitespace-pre-wrap" : "line-clamp-2"}>
                {description}
              </p>
              {hasLongDescription ? (
                <button
                  type="button"
                  className="text-primary mt-1 inline-flex items-center gap-0.5 font-medium"
                  onClick={() => setExpanded(v => !v)}
                >
                  {expanded ? "Show less" : "See more"}
                  <ChevronDown
                    className={`size-3 transition ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              data-testid="explore-tv-watch"
              onClick={handleWatchFull}
            >
              Watch in Explore
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1 rounded-full"
              onClick={() => {
                if (eventId && channelId) {
                  onPrepareTip?.(eventId, channelId);
                }
                setCommentOpen(true);
              }}
            >
              <MessageCircle className="size-4" />
              Comments
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="gap-1 rounded-full"
              onClick={() => {
                if (eventId && channelId) onTip(eventId, channelId);
              }}
            >
              <ChevronsUp className="size-4" />
              Tip
            </Button>
          </div>
        </div>
      </div>

      <CommentDrawer
        isCommentDrawerOpen={commentOpen}
        setIsCommentDrawerOpen={setCommentOpen}
        eventId={eventId ?? ""}
        channelId={channelId ?? null}
        videoTitle={title}
        videoDescription={description}
        numOfTips={ch?.numOfTips ?? 0}
        tippingCharacters={tippingCharacters}
        onContinueToTip={onContinueToTip}
        hostName={ch?.hostName ?? undefined}
        hostUsername={ch?.username ?? undefined}
        stackAboveImmersive
      />
    </>
  );
}
