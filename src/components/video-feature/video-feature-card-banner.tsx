"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Gift, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  flushTvAnalytics,
  trackVideoFeatureCardEvent,
} from "@/lib/tvAnalytics";
import { cn } from "@/lib/utils";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

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
  onTipFeatured?: (cardId: string) => void;
};

function FeatureCardChip({
  card,
  muted,
  showSecondaryBadge,
  expanded,
  onTipFeatured,
}: {
  card: FeatureCardPayload;
  muted?: boolean;
  showSecondaryBadge?: boolean;
  expanded: boolean;
  onTipFeatured?: (cardId: string) => void;
}) {
  return (
    <div
      className={cn(
        "bg-background/95 flex max-w-sm flex-col gap-1 rounded-lg border p-2 text-xs shadow-md backdrop-blur-sm",
        muted && "opacity-90"
      )}
    >
      <div className="flex items-center gap-2">
        {card.scope === "global" ? (
          <Sparkles className="text-primary size-4 shrink-0" />
        ) : (
          <Gift className="text-primary size-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{card.featured.title}</p>
          {showSecondaryBadge ? (
            <p className="text-muted-foreground text-[10px]">Also live</p>
          ) : null}
        </div>
      </div>
      {(card.announcementText || card.adminMessage) && expanded ? (
        <p className="text-muted-foreground line-clamp-4 whitespace-pre-wrap">
          {card.announcementText || card.adminMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px]"
          asChild
        >
          <Link
            href={card.featured.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch
          </Link>
        </Button>
        {onTipFeatured ? (
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => onTipFeatured(card.id)}
          >
            Tip from card
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function VideoFeatureCardBanner({
  surfaceChannelId,
  hostSurfaceChannelId,
  className,
  compact,
  onTipFeatured,
}: Props) {
  const panelId = useId();
  const [targetCard, setTargetCard] = useState<FeatureCardPayload | null>(null);
  const [globalCard, setGlobalCard] = useState<FeatureCardPayload | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedMax, setExpandedMax] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const openedMaxAtMs = useRef<number | null>(null);
  const cardSessionRef = useRef("");
  const impressionSent = useRef<Set<string>>(new Set());

  const primaryCard = targetCard ?? globalCard;
  const secondaryCard = targetCard && globalCard ? globalCard : null;

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

  useEffect(() => {
    openedMaxAtMs.current = null;
    setExpanded(false);
    setExpandedMax(false);
    setDismissed(false);
    cardSessionRef.current = "";
    impressionSent.current = new Set();
  }, [surfaceChannelId]);

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
    void refetchActiveCards();
  }, [refetchActiveCards]);

  useEffect(() => {
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
    [surfaceChannelId, hostSurfaceChannelId]
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

  const openMax = () => {
    if (!primaryCard) return;
    ensureSessionId();
    openedMaxAtMs.current = Date.now();
    trackVideoFeatureCardEvent("card_max_expand", {
      cardId: primaryCard.id,
      cardSessionId: cardSessionRef.current,
      hostSurfaceChannelId: analyticsChannel(),
    });
    void flushTvAnalytics();
    setExpanded(true);
    setExpandedMax(true);
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
    setExpandedMax(false);
  };

  if (
    !videoRequestsClientEnabled ||
    dismissed ||
    !primaryCard ||
    !surfaceChannelId.trim()
  ) {
    return null;
  }

  return (
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
          className="flex flex-col gap-2"
        >
          <FeatureCardChip
            card={primaryCard}
            expanded
            onTipFeatured={onTipFeatured}
          />
          {secondaryCard && secondaryCard.id !== primaryCard.id && !compact ? (
            <FeatureCardChip
              card={secondaryCard}
              expanded
              muted
              showSecondaryBadge
              onTipFeatured={onTipFeatured}
            />
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full text-[11px]"
            onClick={openMax}
          >
            Expand details
          </Button>
        </div>
      ) : null}

      {expandedMax ? (
        <div
          className="animate-in fade-in fixed inset-0 z-[280] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-transparent"
            aria-label="Close overlay"
            onClick={() => closeOverlay()}
          />
          <div className="bg-background relative z-[1] max-h-[min(560px,90vh)] w-full max-w-lg overflow-auto rounded-xl border p-4 shadow-xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-[2]"
              aria-label="Close"
              onClick={() => closeOverlay()}
            >
              <X className="size-4" />
            </Button>
            <div className="pr-10">
              <FeatureCardChip
                card={primaryCard}
                expanded
                onTipFeatured={onTipFeatured}
              />
            </div>
            {secondaryCard &&
            secondaryCard.id !== primaryCard.id &&
            !compact ? (
              <div className="mt-4 border-t pt-4">
                <FeatureCardChip
                  card={secondaryCard}
                  expanded
                  showSecondaryBadge
                  onTipFeatured={onTipFeatured}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
