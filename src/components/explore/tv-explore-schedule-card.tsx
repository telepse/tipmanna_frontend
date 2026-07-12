"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronsUp } from "lucide-react";

import { getExploreChannelMetricsAction } from "@/actions/contents";
import { Button } from "@/components/ui/button";
import { formatPlaylistClock } from "@/lib/tv/playlistDisplay";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";

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
  broadcastEpoch?: number;
  onPlayInExplore: (target: ExploreFeedOpenTarget) => void;
  onTip: (eventId: string, channelId: string) => void;
  thumbUrl: (url?: string) => string | null;
};

export function TvExploreScheduleCard({
  item,
  index,
  broadcastEpoch,
  onPlayInExplore,
  onTip,
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

  const airMs =
    broadcastEpoch != null
      ? broadcastEpoch +
        (typeof item.axisStartSec === "number" ? item.axisStartSec : 0) * 1000
      : null;

  useEffect(() => {
    if (!channelId) return;
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

  return (
    <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="relative aspect-video w-full bg-black">
        {thumb ? (
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
            onClick={() =>
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
              })
            }
          >
            Watch in Explore
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="gap-1 rounded-full"
            onClick={() => onTip(eventId, channelId)}
          >
            <ChevronsUp className="size-4" />
            Tip
          </Button>
        </div>
      </div>
    </div>
  );
}
