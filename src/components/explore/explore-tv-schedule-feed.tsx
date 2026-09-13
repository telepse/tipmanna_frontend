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
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { useTvEventTipCatalog } from "@/hooks/use-tv-event-tip-catalog";
import { resolveTipDrawerPresentation } from "@/lib/resolve-tip-drawer-sets";
import { buildSurfaceTipPriceCatalog } from "@/lib/surface-tip-price-catalog";
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
import {
  clearTvFeedUiRestore,
  readTvFeedUiRestore,
  scheduleTvFeedScrollRestore,
} from "@/lib/explore-tv-feed-return.util";
import { writePlaybackReturn } from "@/lib/playback-return-stack";
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
  dedicatedCommunityId = null,
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
  /** Dedicated community mode: hide source picker when true (legacy). Prefer parent confirm flow. */
  tvSourceLocked?: boolean;
  lockedLabel?: string;
  /** When set, shows dedicated-mode hint above the picker. */
  dedicatedCommunityId?: string | null;
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
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  /** Maps card DOM id → logical card key for preplay activation. */
  const cardDomToKey = useRef<Map<string, string>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardObserverRef = useRef<IntersectionObserver | null>(null);
  const feedRootRef = useRef<HTMLDivElement>(null);

  const { openWalletModalNonce } = useWalletTopupTipResume(
    tipEventId ?? undefined,
    setTipDrawerOpen
  );
  const tipDrawerStripeMounted = tipDrawerOpen || openWalletModalNonce > 0;

  const {
    characterSets: eventCatalogSets,
    tippingCharacters: eventTipCharacters,
  } = useTvEventTipCatalog(tipEventId ?? "");

  const tippingCharactersForDrawer = (
    tipEventId ? eventTipCharacters : []
  ) as RoomCharacter[];

  const tipPres = useTipPresentation(
    tipEventId ?? undefined,
    tippingCharactersForDrawer,
    {
      paymentSurface: "explore_feed",
    }
  );

  const resolvedDrawerSets = useMemo(
    () =>
      resolveTipDrawerPresentation(
        tipEventId ? eventCatalogSets : [],
        tipPres.catalog as RoomCharacter[],
        undefined,
        tipPres.eliteCharacterIds
      ).drawerSets,
    [tipEventId, eventCatalogSets, tipPres.catalog, tipPres.eliteCharacterIds]
  );

  const tipPriceCatalog = useMemo(
    () =>
      buildSurfaceTipPriceCatalog({
        enrichedCatalog: tipPres.catalog as RoomCharacter[],
        videoCatalog: tippingCharactersForDrawer,
        characterSets: resolvedDrawerSets,
      }),
    [tipPres.catalog, tippingCharactersForDrawer, resolvedDrawerSets]
  );

  useGlobalTipStream({
    eventId: tipEventId ?? undefined,
    enabled: feedSurfaceActive,
    surface: "explore_tv_schedule",
  });
  usePaymentAnimationPlayer({
    eventId: tipEventId ?? "",
    characters: (tipEventId ? tipPriceCatalog : []) as RoomCharacter[],
    enabled: feedSurfaceActive && Boolean(tipEventId),
    surface: "explore_tv_schedule",
  });
  usePayerOriginAnimationRecovery({
    eventId: tipEventId ?? "",
    paymentSurface: "explore_feed",
    characters: (tipEventId ? tipPriceCatalog : []) as RoomCharacter[],
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

  const pendingUiRestoreRef = useRef(readTvFeedUiRestore());
  const uiRestoreAppliedRef = useRef(false);

  useEffect(() => {
    const restore = pendingUiRestoreRef.current;
    if (!restore || uiRestoreAppliedRef.current) return;
    if (loading && ongoing.length === 0 && upcoming.length === 0) return;

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 24;

    const getScrollContainer = () => {
      let node: HTMLElement | null = feedRootRef.current;
      while (node) {
        const style = window.getComputedStyle(node);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 2
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return feedRootRef.current;
    };

    const tryRestore = () => {
      if (cancelled || uiRestoreAppliedRef.current) return;
      attempt += 1;

      if (restore.channelId && cardDomToKey.current.size > 0) {
        for (const [domKey, logicalKey] of cardDomToKey.current.entries()) {
          if (logicalKey.includes(restore.channelId)) {
            setActiveCardKey(domKey);
            break;
          }
        }
      }

      const cardsReady =
        cardDomToKey.current.size > 0 ||
        (ongoing.length === 0 && upcoming.length === 0);
      if (!cardsReady && attempt < maxAttempts) {
        window.setTimeout(tryRestore, 50 * attempt);
        return;
      }

      uiRestoreAppliedRef.current = true;
      pendingUiRestoreRef.current = null;
      clearTvFeedUiRestore();
      scheduleTvFeedScrollRestore(getScrollContainer, restore.scrollTop);
    };

    tryRestore();
    return () => {
      cancelled = true;
    };
  }, [loading, ongoing, upcoming]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    cardObserverRef.current?.disconnect();
    cardObserverRef.current = new IntersectionObserver(
      entries => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (!best) return;
        const domKey = (best.target as HTMLElement).dataset.cardKey;
        if (domKey) setActiveCardKey(domKey);
      },
      { threshold: [0.35, 0.55, 0.75] }
    );
    for (const el of cardRefs.current.values()) {
      cardObserverRef.current.observe(el);
    }
    return () => {
      cardObserverRef.current?.disconnect();
      cardObserverRef.current = null;
    };
  }, [ongoing, upcoming]);

  const registerCardRef = useCallback(
    (domKey: string, logicalKey: string, node: HTMLDivElement | null) => {
      const prev = cardRefs.current.get(domKey);
      if (prev && cardObserverRef.current) {
        cardObserverRef.current.unobserve(prev);
      }
      if (node) {
        node.dataset.cardKey = domKey;
        cardRefs.current.set(domKey, node);
        cardDomToKey.current.set(domKey, logicalKey);
        cardObserverRef.current?.observe(node);
      } else {
        cardRefs.current.delete(domKey);
        cardDomToKey.current.delete(domKey);
      }
    },
    []
  );

  const handlePlayInExploreWithReturn = useCallback(
    (target: ExploreFeedOpenTarget, cardIndex: number) => {
      if (typeof window !== "undefined") {
        let scrollTop = 0;
        let scrollNode: HTMLElement | null = feedRootRef.current;
        while (scrollNode) {
          const style = window.getComputedStyle(scrollNode);
          if (
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            scrollNode.scrollHeight > scrollNode.clientHeight + 2
          ) {
            scrollTop = scrollNode.scrollTop;
            break;
          }
          scrollNode = scrollNode.parentElement;
        }
        const returnUrl = new URL(
          `${window.location.pathname}${window.location.search}`,
          window.location.origin
        );
        returnUrl.searchParams.set("feedTab", "tv");
        const returnTo = `${returnUrl.pathname}${returnUrl.search}`;
        writePlaybackReturn({
          returnTo,
          label: "Back to TV",
          tvFeed: {
            scrollTop,
            channelId: target.videoId,
            cardIndex,
          },
        });
      }
      onPlayInExplore(target);
    },
    [onPlayInExplore]
  );

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

  const prepareTipForCard = useCallback(
    (eventId: string, channelId: string) => {
      setTipEventId(eventId);
      setTipChannelId(channelId);
    },
    []
  );

  const openTipDrawerForCard = useCallback(
    (eventId: string, channelId: string) => {
      setTipEventId(eventId);
      setTipChannelId(channelId);
      setTipDrawerOpen(true);
    },
    []
  );

  const renderCard = (item: TvPlaylistLike, i: number) => {
    const channelId = item.channel?.id ?? `slot-${i}`;
    const cardKey = `${channelId}-${i}`;
    const cardEventId = item.channel?.eventId;
    return (
      <TvExploreScheduleCard
        key={cardKey}
        item={item}
        index={i}
        broadcastEpoch={broadcastEpoch}
        cardKey={cardKey}
        isActiveCard={activeCardKey === cardKey}
        cardRef={node => registerCardRef(cardKey, channelId, node)}
        onPlayInExplore={target => handlePlayInExploreWithReturn(target, i)}
        onTip={openTipDrawerForCard}
        onPrepareTip={prepareTipForCard}
        tippingCharacters={
          cardEventId && tipEventId === cardEventId
            ? (tipPriceCatalog as RoomCharacter[])
            : []
        }
        onContinueToTip={() => {
          if (cardEventId && channelId) {
            openTipDrawerForCard(cardEventId, channelId);
          }
        }}
        thumbUrl={thumbUrl}
      />
    );
  };

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
      <div
        ref={feedRootRef}
        className="mx-auto max-w-lg space-y-6 px-3 py-3 pb-24"
        data-explore-tv-feed-root
      >
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
          {dedicatedCommunityId && tvSource === dedicatedCommunityId ? (
            <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
              <span className="font-medium">Dedicated mode</span>
              {lockedLabel
                ? `· ${lockedLabel.replace(/^Locked to /, "")}`
                : null}
            </p>
          ) : null}
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
          tippingCharacters={tipPriceCatalog}
          enabled
          textTipUnitPrice={tipPres.textUnitPrice}
        >
          <TipDrawer
            open={tipDrawerOpen}
            onOpenChange={setTipDrawerOpen}
            eventId={tipEventId ?? ""}
            tippingCharacters={tipPriceCatalog}
            characterSets={resolvedDrawerSets}
            paymentSurface="explore_feed"
            paymentChannelId={tipChannelId}
            openWalletModalNonce={openWalletModalNonce}
            stackAboveImmersive
            textTipUnitPrice={tipPres.textUnitPrice}
            payLabel={tipPres.payLabel}
            tipQuoteContext={tipPres.quoteCtx}
          />
        </TippingElementsProvider>
      ) : null}
    </>
  );
}
