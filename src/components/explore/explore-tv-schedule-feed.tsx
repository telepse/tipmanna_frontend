/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Radio, RefreshCw } from "lucide-react";

const TipDrawer = dynamic(
  () =>
    import("@/components/events/tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { usePayerOriginAnimationRecovery } from "@/hooks/use-payer-origin-animation-recovery";
import {
  acquireCommunityLiveTvChannel,
  acquireGlobalLiveTvChannel,
  releaseCommunityLiveTvChannel,
  releaseGlobalLiveTvChannel,
} from "@/hooks/use-global-tip-stream";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { fetchTvScheduleAction } from "@/actions/tv-schedule";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  prefetchExploreTvSchedule,
  waitExploreTvPrefetch,
} from "@/lib/explore-tv-prefetch-cache";
import { TvExploreScheduleCard } from "@/components/explore/tv-explore-schedule-card";
import type { RoomCharacter } from "@/types";

type TvPlaylistLike = {
  channel?: {
    id: string;
    url?: string;
    title?: string;
    hostName?: string;
    username?: string;
    numOfTips?: number;
    eventId?: string;
    eventType?: string;
    description?: string | null;
  };
  segmentKind?: string;
  blockTitle?: string;
  duration?: number;
  axisStartSec?: number;
};

function thumbUrl(videoUrl: string | undefined): string | null {
  if (!videoUrl) return null;
  const id = extractYoutubeID(videoUrl);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function buildTvScheduleQuery(f?: {
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
}): string {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.eventVideoTypes?.length) {
    p.set("eventVideoTypes", f.eventVideoTypes.join(","));
  }
  if (f.language?.trim()) {
    p.set("language", f.language.trim());
  }
  if (f.country?.trim()) {
    p.set("country", f.country.trim());
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function ExploreTvScheduleFeed({
  characters,
  characterSets,
  onPlayInExplore,
  tvExploreFilters,
  feedSurfaceActive = true,
  tvSource = "tipmanna",
  tvCommunityOptions = [],
  onTvSourceChange,
  tvSourceLocked = false,
  lockedLabel,
}: {
  characters: any[];
  characterSets: any[];
  onPlayInExplore: (target: ExploreFeedOpenTarget) => void;
  tvExploreFilters?: {
    eventVideoTypes?: string[];
    language?: string;
    country?: string;
  };
  /** False while Explore parent uses Discover tab — subtree stays mounted under `hidden`. */
  feedSurfaceActive?: boolean;
  /** `tipmanna` = global guide; otherwise a joined `communityId` (Phase 8: schedule per community). */
  tvSource?: "tipmanna" | string;
  tvCommunityOptions?: { id: string; name: string }[];
  onTvSourceChange?: (next: "tipmanna" | string) => void;
  /** Dedicated community mode: hide source picker. */
  tvSourceLocked?: boolean;
  lockedLabel?: string;
}) {
  const [ongoing, setOngoing] = useState<TvPlaylistLike[]>([]);
  const [upcoming, setUpcoming] = useState<TvPlaylistLike[]>([]);
  const [ongoingLabel, setOngoingLabel] = useState("On air now");
  const [upcomingLabel, setUpcomingLabel] = useState("Next 12 hours");
  const [broadcastEpoch, setBroadcastEpoch] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const etagRef = useRef<string | null>(null);
  const [tipEventId, setTipEventId] = useState<string | null>(null);
  const [tipChannelId, setTipChannelId] = useState<string | null>(null);
  const [tipDrawerOpen, setTipDrawerOpen] = useState(false);

  const { openWalletModalNonce } = useWalletTopupTipResume(
    tipEventId ?? undefined,
    setTipDrawerOpen
  );
  const tipDrawerStripeMounted = tipDrawerOpen || openWalletModalNonce > 0;

  useGlobalTipStream({
    eventId: tipEventId ?? undefined,
    enabled: feedSurfaceActive,
    surface: "explore_tv_schedule",
  });
  usePaymentAnimationPlayer({
    eventId: tipEventId ?? "",
    characters: characters as RoomCharacter[],
    enabled: feedSurfaceActive && Boolean(tipEventId),
    surface: "explore_tv_schedule",
  });
  usePayerOriginAnimationRecovery({
    eventId: tipEventId ?? "",
    paymentSurface: "explore_feed",
    characters: characters as RoomCharacter[],
    enabled: feedSurfaceActive && Boolean(tipEventId),
    surface: "explore_tv_schedule",
  });
  useAutoDropTip(tipEventId ?? "", Boolean(tipEventId) && feedSurfaceActive);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        src: tvSource,
        t: tvExploreFilters?.eventVideoTypes ?? [],
        l: tvExploreFilters?.language ?? "",
        c: tvExploreFilters?.country ?? "",
      }),
    [tvExploreFilters, tvSource]
  );

  useEffect(() => {
    etagRef.current = null;
  }, [filterKey]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const warmed = await waitExploreTvPrefetch(filterKey);
      if (warmed) {
        setOngoingLabel(warmed.ongoingLabel);
        setUpcomingLabel(warmed.upcomingLabel);
        setOngoing(warmed.ongoing as TvPlaylistLike[]);
        setUpcoming(warmed.upcoming as TvPlaylistLike[]);
        setBroadcastEpoch(warmed.broadcastEpoch);
        setLoading(false);
        return;
      }
      const q = buildTvScheduleQuery(tvExploreFilters);
      const res = await fetchTvScheduleAction({
        communityId: tvSource !== "tipmanna" ? tvSource : null,
        ifNoneMatch: etagRef.current,
        query: q ? q.replace(/^\?/, "") : undefined,
      });
      if (res.success && res.data?.notModified) {
        setLoading(false);
        return;
      }
      if (!res.success || !res.data?.body) {
        throw new Error(
          res.error ?? res.message ?? "Could not load TV schedule"
        );
      }
      const data = res.data.body as {
        ongoingLabel?: string;
        upcomingLabel?: string;
        items?: unknown[];
        alternateBatchItems?: unknown[];
        broadcastEpoch?: number;
      };
      etagRef.current = res.data.etag ?? etagRef.current;
      setOngoingLabel(
        typeof data.ongoingLabel === "string" ? data.ongoingLabel : "On air now"
      );
      setUpcomingLabel(
        typeof data.upcomingLabel === "string"
          ? data.upcomingLabel
          : "Next 12 hours"
      );
      setBroadcastEpoch(
        typeof data.broadcastEpoch === "number"
          ? data.broadcastEpoch
          : undefined
      );
      setOngoing(
        Array.isArray(data.items) ? (data.items as TvPlaylistLike[]) : []
      );
      setUpcoming(
        Array.isArray(data.alternateBatchItems)
          ? (data.alternateBatchItems as TvPlaylistLike[])
          : []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load TV schedule");
    } finally {
      setLoading(false);
    }
  }, [tvExploreFilters, tvSource, filterKey]);

  useEffect(() => {
    prefetchExploreTvSchedule({
      tvSource,
      eventVideoTypes: tvExploreFilters?.eventVideoTypes,
      language: tvExploreFilters?.language,
      country: tvExploreFilters?.country,
    });
    void loadSchedule();
  }, [loadSchedule, tvExploreFilters, tvSource]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScheduleUpdated = () => {
      etagRef.current = null;
      void loadSchedule();
    };

    if (tvSource !== "tipmanna") {
      const ch = acquireCommunityLiveTvChannel(tvSource);
      if (!ch) return () => {};
      ch.bind("tv-schedule-updated", onScheduleUpdated);
      return () => {
        ch.unbind("tv-schedule-updated", onScheduleUpdated);
        releaseCommunityLiveTvChannel(tvSource);
      };
    }

    const channel = acquireGlobalLiveTvChannel();
    if (!channel) return () => {};
    channel.bind("tv-schedule-updated", onScheduleUpdated);
    return () => {
      channel.unbind("tv-schedule-updated", onScheduleUpdated);
      releaseGlobalLiveTvChannel();
    };
  }, [loadSchedule, tvSource]);

  const renderCard = (item: TvPlaylistLike, i: number) => (
    <TvExploreScheduleCard
      key={`${item.channel?.id ?? "slot"}-${i}`}
      item={item}
      index={i}
      broadcastEpoch={broadcastEpoch}
      onPlayInExplore={onPlayInExplore}
      onTip={(eventId, channelId) => {
        setTipEventId(eventId);
        setTipChannelId(channelId);
        setTipDrawerOpen(true);
      }}
      thumbUrl={thumbUrl}
    />
  );

  if (loading && ongoing.length === 0 && upcoming.length === 0) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-2 px-4 text-sm text-zinc-600">
        <Radio className="size-6 animate-pulse opacity-70" />
        Loading TV guide…
      </div>
    );
  }

  if (error && ongoing.length === 0 && upcoming.length === 0) {
    return (
      <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadSchedule()}
        >
          <RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-lg space-y-6 px-3 py-3 pb-24">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">TV on Explore</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => void loadSchedule()}
          >
            <RefreshCw className="mr-1 size-4" />
            Sync
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-muted-foreground text-[11px]">
            TV schedule source
          </p>
          {tvSourceLocked ? (
            <p className="text-foreground bg-muted/40 rounded-md border px-3 py-2 text-xs">
              {lockedLabel ??
                "TV is locked to your dedicated community for this session."}
            </p>
          ) : (
            <Select
              value={tvSource}
              onValueChange={v =>
                onTvSourceChange?.(v === "tipmanna" ? "tipmanna" : v)
              }
            >
              <SelectTrigger className="h-9 w-full text-left text-xs">
                <SelectValue placeholder="Choose source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="tipmanna"
                  className="text-xs"
                >
                  Tipmanna TV (global)
                </SelectItem>
                {tvCommunityOptions.map(c => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className="text-xs"
                  >
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {tvSource !== "tipmanna" ? (
            <p className="text-muted-foreground text-[11px]">
              Showing this community&apos;s TV loop when an admin has activated
              community TV and the bank has approved videos.
            </p>
          ) : null}
        </div>

        <section className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {ongoingLabel}
          </h3>
          <div className="flex flex-col gap-4">
            {ongoing.map((it, i) => renderCard(it, i))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {upcomingLabel}
          </h3>
          <div className="flex flex-col gap-4">
            {upcoming.map((it, i) => renderCard(it, i + 10000))}
          </div>
        </section>
      </div>

      {tipDrawerStripeMounted ? (
        <TippingElementsProvider
          tippingCharacters={characters as RoomCharacter[]}
          enabled
        >
          <TipDrawer
            open={tipDrawerOpen}
            onOpenChange={setTipDrawerOpen}
            eventId={tipEventId ?? ""}
            tippingCharacters={characters}
            characterSets={characterSets}
            paymentSurface="explore_feed"
            paymentChannelId={tipChannelId}
            openWalletModalNonce={openWalletModalNonce}
            stackAboveImmersive
          />
        </TippingElementsProvider>
      ) : null}
    </>
  );
}
