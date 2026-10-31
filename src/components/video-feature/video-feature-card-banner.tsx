"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleX,
  Gift,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  flushTvAnalytics,
  trackVideoFeatureCardEvent,
} from "@/lib/tvAnalytics";
import { cn } from "@/lib/utils";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { useFeatureCardTipContext } from "@/components/video-feature/feature-card-tip-context";

export type FeatureCardPayload = {
  id: string;
  scope: string;
  announcementText?: string | null;
  adminMessage?: string | null;
  featured: {
    channelId: string;
    eventId: string;
    title: string;
    descriptionSnippet?: string;
    url: string;
  };
};

function apiBase(): string {
  const b = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return b.replace(/\/$/, "");
}

const videoRequestsClientEnabled =
  process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !== "false";

type Props = {
  /** Playback channel (“host surface”) this viewer is watching. */
  surfaceChannelId: string;
  /** Shown in analytics payloads when inferring visitor context. */
  hostSurfaceChannelId?: string;
  className?: string;
  compact?: boolean;
  /** Published tip section CTA label for overlay Engage button. */
  sectionCtaLabel?: string;
  /** When true, do not clear feature-card tip context on overlay close. */
  pageDrawerOpen?: boolean;
  /** When false, hide Engage CTA (Watch-only surfaces without a tip drawer). */
  showEngageCta?: boolean;
  onTipFeatured?: (cardId: string) => void;
  /** Pause underlying playback while the featured overlay is open. */
  onOverlayOpenChange?: (open: boolean) => void;
};

function featureCardThumb(url: string): string {
  const id = extractYoutubeID(url);
  return id
    ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    : "/default-event-image.jpg";
}

export function VideoFeatureCardBanner({
  surfaceChannelId,
  hostSurfaceChannelId,
  className,
  compact,
  sectionCtaLabel,
  pageDrawerOpen = false,
  showEngageCta = true,
  onTipFeatured,
  onOverlayOpenChange,
}: Props) {
  const panelId = useId();
  const { setActiveVideoFeatureCardId } = useFeatureCardTipContext();
  const engageLabel = sectionCtaLabel?.trim() || "Engage";
  const [targetCard, setTargetCard] = useState<FeatureCardPayload | null>(null);
  const [globalCard, setGlobalCard] = useState<FeatureCardPayload | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const openedMaxAtMs = useRef<number | null>(null);
  const cardSessionRef = useRef("");
  const impressionSent = useRef<Set<string>>(new Set());

  const primaryCard = targetCard ?? globalCard;

  const thumbSrc = useMemo(
    () => (primaryCard ? featureCardThumb(primaryCard.featured.url) : null),
    [primaryCard]
  );

  const ensureSessionId = () => {
    if (cardSessionRef.current) return cardSessionRef.current;
    cardSessionRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `vf-${Date.now()}`;
    return cardSessionRef.current;
  };

  const analyticsChannel = (): string =>
    hostSurfaceChannelId?.trim() || surfaceChannelId.trim();

  const triggerTipFeatured = useCallback(
    (cardId: string) => {
      setActiveVideoFeatureCardId(cardId);
      onTipFeatured?.(cardId);
    },
    [onTipFeatured, setActiveVideoFeatureCardId]
  );

  useEffect(() => {
    openedMaxAtMs.current = null;
    setExpanded(false);
    setOverlayOpen(false);
    setDismissed(false);
    cardSessionRef.current = "";
    impressionSent.current = new Set();
    onOverlayOpenChange?.(false);
  }, [surfaceChannelId, onOverlayOpenChange]);

  const refetchActiveCards = useCallback(async () => {
    if (!videoRequestsClientEnabled || !surfaceChannelId.trim()) {
      setTargetCard(null);
      setGlobalCard(null);
      return;
    }
    try {
      const url = `${apiBase()}/video-feature-cards/active?targetChannelId=${encodeURIComponent(surfaceChannelId)}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as {
        targetCard?: FeatureCardPayload | null;
        globalCard?: FeatureCardPayload | null;
      };
      if (!res.ok) return;
      setTargetCard(j.targetCard ?? null);
      setGlobalCard(j.globalCard ?? null);
    } catch {
      setTargetCard(null);
      setGlobalCard(null);
    }
  }, [surfaceChannelId]);

  useEffect(() => {
    if (isExploreE2eFixturesActiveOnClient()) return;
    void refetchActiveCards();
  }, [refetchActiveCards]);

  useEffect(() => {
    if (isExploreE2eFixturesActiveOnClient()) return;
    if (!videoRequestsClientEnabled || !surfaceChannelId.trim()) return;
    const targetChannelName = `video-card-target-${surfaceChannelId}`;
    const globalChannelName = "video-card-global";
    const targetChannel = subscribeChannel(targetChannelName);
    const globalChannel = subscribeChannel(globalChannelName);
    if (!targetChannel || !globalChannel) return;

    const onFeatureCardUpdate = () => {
      void refetchActiveCards();
    };

    targetChannel.bind("feature-card-update", onFeatureCardUpdate);
    globalChannel.bind("feature-card-update", onFeatureCardUpdate);

    return () => {
      targetChannel.unbind("feature-card-update", onFeatureCardUpdate);
      globalChannel.unbind("feature-card-update", onFeatureCardUpdate);
      unsubscribeChannel(targetChannelName);
      unsubscribeChannel(globalChannelName);
    };
  }, [surfaceChannelId, refetchActiveCards]);

  const bumpImpression = useCallback(
    (cardId: string) => {
      if (impressionSent.current.has(cardId)) return;
      impressionSent.current.add(cardId);
      ensureSessionId();
      trackVideoFeatureCardEvent("card_impression", {
        cardId,
        cardSessionId: cardSessionRef.current,
        hostSurfaceChannelId: analyticsChannel(),
      });
      void flushTvAnalytics();
    },
    [hostSurfaceChannelId, surfaceChannelId]
  );

  useEffect(() => {
    if (!primaryCard || dismissed || !surfaceChannelId.trim()) return;
    bumpImpression(primaryCard.id);
  }, [primaryCard, dismissed, bumpImpression, surfaceChannelId]);

  const trackExpandMini = () => {
    if (!primaryCard) return;
    ensureSessionId();
    trackVideoFeatureCardEvent("card_mini_expand", {
      cardId: primaryCard.id,
      cardSessionId: cardSessionRef.current,
      hostSurfaceChannelId: analyticsChannel(),
    });
    void flushTvAnalytics();
  };

  const openOverlay = () => {
    if (!primaryCard) return;
    ensureSessionId();
    setActiveVideoFeatureCardId(primaryCard.id);
    openedMaxAtMs.current = Date.now();
    trackVideoFeatureCardEvent("card_max_expand", {
      cardId: primaryCard.id,
      cardSessionId: cardSessionRef.current,
      hostSurfaceChannelId: analyticsChannel(),
    });
    void flushTvAnalytics();
    setOverlayOpen(true);
    onOverlayOpenChange?.(true);
  };

  const closeOverlay = () => {
    const id = primaryCard?.id;
    const openedAt = openedMaxAtMs.current;
    if (id && openedAt !== null) {
      trackVideoFeatureCardEvent("overlay_close", {
        cardId: id,
        ts: Date.now(),
        openedAtMs: openedAt,
        cardSessionId: cardSessionRef.current,
        hostSurfaceChannelId: analyticsChannel(),
      });
      void flushTvAnalytics();
    }
    openedMaxAtMs.current = null;
    setOverlayOpen(false);
    onOverlayOpenChange?.(false);
    if (!pageDrawerOpen) {
      setActiveVideoFeatureCardId(null);
    }
  };

  if (
    !videoRequestsClientEnabled ||
    dismissed ||
    !primaryCard ||
    !surfaceChannelId.trim()
  ) {
    return null;
  }

  const embedId = extractYoutubeID(primaryCard.featured.url);

  return (
    <>
      <div
        className={cn(
          "pointer-events-auto flex flex-col gap-2",
          compact ? "max-w-[min(100%,18rem)]" : "max-w-md",
          className
        )}
      >
        <div className="bg-background/90 flex items-start gap-2 rounded-lg border shadow-md backdrop-blur-sm">
          <div className="min-w-0 flex-1 p-2">
            <p className="text-[11px] font-semibold tracking-wide uppercase">
              {primaryCard.scope === "global"
                ? "Platform feature"
                : "Featured video"}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-medium">
              {primaryCard.featured.title}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-0.5 p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Dismiss feature card"
              onClick={() => {
                closeOverlay();
                setDismissed(true);
              }}
            >
              <X className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => {
                const next = !expanded;
                setExpanded(next);
                if (next) trackExpandMini();
              }}
            >
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {expanded ? (
          <div
            id={panelId}
            className="bg-background/95 flex flex-col gap-2 rounded-lg border p-2 text-xs shadow-md backdrop-blur-sm"
          >
            {thumbSrc ? (
              <button
                type="button"
                className="relative aspect-video w-full overflow-hidden rounded-md bg-black"
                onClick={openOverlay}
                aria-label={`Play featured video: ${primaryCard.featured.title}`}
              >
                <img
                  src={thumbSrc}
                  alt=""
                  className="size-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[11px] font-semibold text-white">
                  Play featured
                </span>
              </button>
            ) : null}
            {primaryCard.announcementText ? (
              <p className="text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                {primaryCard.announcementText}
              </p>
            ) : null}
            {primaryCard.adminMessage ? (
              <p className="text-muted-foreground/90 line-clamp-4 text-[11px] whitespace-pre-wrap italic">
                {primaryCard.adminMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={openOverlay}
              >
                {primaryCard.scope === "global" ? (
                  <Sparkles className="mr-1 size-3" />
                ) : (
                  <Gift className="mr-1 size-3" />
                )}
                Watch here
              </Button>
              {showEngageCta ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => triggerTipFeatured(primaryCard.id)}
                >
                  {engageLabel}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {overlayOpen && embedId ? (
        <div
          className={`${OVERLAY_Z_INDEX} fixed inset-0 flex items-center justify-center bg-black/80 p-3 sm:p-4`}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-transparent"
            aria-label="Close overlay"
            onClick={closeOverlay}
          />
          <div
            className="relative z-[1] w-full max-w-3xl rounded-xl border bg-white p-3 shadow-xl sm:p-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close featured video"
              onClick={closeOverlay}
              className="absolute top-3 right-3 z-[2] rounded-full bg-black/60 p-1.5 text-white"
            >
              <CircleX className="size-4" />
            </button>
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <iframe
                title={primaryCard.featured.title}
                src={`https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0`}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="mt-3 pr-8 text-sm font-medium">
              {primaryCard.featured.title}
            </p>
            {primaryCard.announcementText ? (
              <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                {primaryCard.announcementText}
              </p>
            ) : null}
            {primaryCard.adminMessage ? (
              <p className="text-muted-foreground/90 mt-1 text-[11px] whitespace-pre-wrap italic">
                {primaryCard.adminMessage}
              </p>
            ) : null}
            {showEngageCta ? (
              <Button
                type="button"
                size="sm"
                className="mt-3"
                onClick={() => triggerTipFeatured(primaryCard.id)}
              >
                {engageLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
