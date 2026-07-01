/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * TV /tv page client wrapper.
 *
 * Legacy desktop browse-only layout (thumbnails + carousels) lived in `TVPageClient`.
 * It is preserved below as a commented block for a possible future “TV browse section”.
 * Current desktop uses `TvWebExperience`: same interactive features as mobile (looper,
 * tips, Stripe, schedule) with a full-width channel-style layout.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useMediaQuery } from "react-responsive";

import { Channel } from "@/types/channel.types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTV } from "../tv-provider";
import { RootState } from "@/redux/store";
import { useTvSourcePicker } from "./tv-source-picker-provider";
import { setSelectedTips } from "@/features/tip-slice";
import type { RoomCharacter } from "@/types";
import { TVPageClient } from "@/components/tv/tv-page-client";
import {
  TvInteractiveShell,
  type TvInteractiveShellProps,
} from "./tv-interactive-shell";
import { TvWebExperience } from "./tv-web-experience";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import {
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  type TvEventCatalog,
} from "@/lib/tv-event-catalog-cache";
import { useTvEnforcementDeepLink } from "@/hooks/use-tv-enforcement-deep-link";
import { tvTrace } from "@/lib/tvDebugLog";
import { schedulePostTtfvIdle } from "@/lib/tv-post-ttfv-idle";
import { prefetchTvScheduleTips } from "@/lib/drawer-prefetch-cache";
import { useTvLazyCharacters } from "@/hooks/use-tv-lazy-characters";

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  styleName:
    | "Confetti"
    | "Pop and Shoot"
    | "Fall"
    | "Burst"
    | "Screen Shake"
    | "Luxurious"
    | "Float"
    | "Spin";
}

interface CharacterSet {
  id: string;
  name: string;
  characters: Character[];
}

interface Props {
  channels?: Channel[];
  characters: Character[];
  characterSets?: CharacterSet[];
}

export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("currentUser");
  if (saved) return JSON.parse(saved);

  const newUser = {
    id: `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: "anonymous" as const,
    username: "Anonymous User",
    isAuthenticated: false,
  };
  localStorage.setItem("currentUser", JSON.stringify(newUser));
  return newUser;
};

export default function TVPageClientWrapper({
  channels = [],
  characters: ssrCharacters,
}: Props) {
  const { characters } = useTvLazyCharacters(ssrCharacters);
  const {
    items,
    totalDuration,
    currentIndex,
    mode,
    isReady: tvReady,
    goLive,
    playLocal,
    switchToLocal,
    preparePlaybackForTipDrawer,
    snapshotPlaybackForPaymentRedirect,
    resumeAfterPayment,
    scheduleError,
    scheduleStale,
    retryScheduleLoad,
    playingItemOverride,
    scheduleSourceCommunityId,
    playEnforcementProgram,
  } = useTV();

  const {
    communityFeatureOn,
    tvPickerOpen,
    setTvPickerOpen,
    tvPickerOptions,
    pickTipmanna,
    pickCommunity,
  } = useTvSourcePicker();

  const dispatch = useDispatch();
  const selectedTips = useSelector((s: RootState) => s.tip.selectedTips);

  const isMobile = useMediaQuery({ maxWidth: "500px" });

  useTvEnforcementDeepLink({
    tvReady,
    itemsLength: items.length,
    scheduleSourceCommunityId,
    playEnforcementProgram,
  });

  useEffect(() => {
    if (!isMobile) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMobile]);

  const [activeTab, setActiveTab] = useState<"playlist" | "tips">("playlist");

  const handleSelectChannel = (index: number) => {
    playLocal(index);
  };

  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const [isTVDrawerOpen, setIsTvDrawerOpen] = useState(false);

  const prevTipDrawerOpen = useRef(false);
  const prevTipCountRef = useRef(0);

  useEffect(() => {
    const tipCount = selectedTips.length;
    if (isTipDrawerOpen && !prevTipDrawerOpen.current) {
      preparePlaybackForTipDrawer(tipCount > 0);
    } else if (!isTipDrawerOpen && prevTipDrawerOpen.current) {
      resumeAfterPayment();
    } else if (
      isTipDrawerOpen &&
      prevTipDrawerOpen.current &&
      tipCount > 0 &&
      prevTipCountRef.current === 0
    ) {
      preparePlaybackForTipDrawer(true);
    }
    prevTipDrawerOpen.current = isTipDrawerOpen;
    prevTipCountRef.current = tipCount;
  }, [
    isTipDrawerOpen,
    selectedTips.length,
    preparePlaybackForTipDrawer,
    resumeAfterPayment,
  ]);

  const currentScheduleItem = useMemo(
    () => (playingItemOverride ?? items[currentIndex]) || items[0],
    [items, currentIndex, playingItemOverride]
  );

  const tipDrawerEventId =
    currentScheduleItem?.channel?.eventId ??
    currentScheduleItem?.defaultChannelEventId ??
    "";

  const playingVideoKey = useMemo(() => {
    if (!tipDrawerEventId || items.length === 0) return "";
    return `${currentScheduleItem?.id ?? ""}:${currentScheduleItem?.channel?.id ?? ""}:${tipDrawerEventId}`;
  }, [
    tipDrawerEventId,
    items.length,
    currentScheduleItem?.id,
    currentScheduleItem?.channel?.id,
  ]);

  const { openWalletModalNonce } = useWalletTopupTipResume(
    tipDrawerEventId || undefined,
    setIsTipDrawerOpen
  );

  const [videoTipCatalog, setVideoTipCatalog] = useState<TvEventCatalog | null>(
    null
  );

  useEffect(() => {
    if (!playingVideoKey || !tipDrawerEventId) {
      setVideoTipCatalog(null);
      return;
    }

    setVideoTipCatalog(getCachedTvEventCatalog(tipDrawerEventId));

    let cancelled = false;
    void loadTvEventCatalog(tipDrawerEventId).then(catalog => {
      if (!cancelled) setVideoTipCatalog(catalog);
    });

    return () => {
      cancelled = true;
    };
  }, [playingVideoKey, tipDrawerEventId]);

  useEffect(() => {
    if (!items.length || !tipDrawerEventId) return;
    schedulePostTtfvIdle(() => {
      prefetchTvScheduleTips(items, currentIndex, 3);
    });
  }, [items, currentIndex, tipDrawerEventId, playingVideoKey]);

  const characterSetsForDrawer = (videoTipCatalog?.characterSets ?? []).filter(
    set => Array.isArray(set.characters) && set.characters.length > 0
  );

  const tippingCharactersForDrawer = (videoTipCatalog?.characters ??
    []) as RoomCharacter[];

  const prevPlayingVideoKeyRef = useRef("");

  useEffect(() => {
    if (!playingVideoKey) return;
    if (prevPlayingVideoKeyRef.current === playingVideoKey) return;
    const prev = prevPlayingVideoKeyRef.current;
    prevPlayingVideoKeyRef.current = playingVideoKey;
    if (prev === "") return;
    dispatch(setSelectedTips([]));
  }, [playingVideoKey, dispatch]);

  useEffect(() => {
    tvTrace("navigation", "tv_page_open_dispatch", {});
    window.dispatchEvent(new Event("tv-page-open"));
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(10);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;

    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }

    const progress = ((el.scrollTop || 0) / maxScroll) * 100;
    setScrollProgress(progress);
  };

  const sharedShellProps: Omit<TvInteractiveShellProps, "variant"> = {
    characters: characters as unknown as RoomCharacter[],
    tvReady,
    items,
    totalDuration,
    mode,
    goLive,
    switchToLocal,
    scheduleStale,
    scheduleError,
    retryScheduleLoad,
    activeTab,
    setActiveTab,
    handleSelectChannel,
    isTipDrawerOpen,
    setIsTipDrawerOpen,
    isTVDrawerOpen,
    setIsTvDrawerOpen,
    scrollRef,
    scrollProgress,
    handleScroll,
    tipDrawerEventId,
    tippingCharactersForDrawer,
    characterSetsForDrawer,
    videoTipKey: playingVideoKey,
    openWalletModalNonce,
    onSnapshotPaymentRedirect: snapshotPlaybackForPaymentRedirect,
  };

  return (
    <>
      <Dialog
        open={tvPickerOpen}
        onOpenChange={setTvPickerOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Which TV do you want to watch?</DialogTitle>
            <DialogDescription>
              Tipmanna TV is the global broadcast. Community TVs are available
              when you are a member of a community that has TV enabled by an
              admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={pickTipmanna}
            >
              Tipmanna TV (global)
            </Button>
            {tvPickerOptions.map(c => (
              <Button
                key={c.id}
                type="button"
                variant="secondary"
                onClick={() => pickCommunity(c.id)}
              >
                {c.name}
              </Button>
            ))}
            {communityFeatureOn ? (
              <Button
                asChild
                variant="outline"
              >
                <Link href="/community">Community hub</Link>
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {!isMobile && <TvWebExperience {...sharedShellProps} />}

      {isMobile && (
        <div className="w-full">
          <TvInteractiveShell
            {...sharedShellProps}
            variant="mobile"
          />
        </div>
      )}

      {/* Legacy desktop browse layout (thumbnail carousels). Set to true only for reference / future TV browse section; active /tv desktop uses TvWebExperience above. */}
      {false && (
        <div>
          <TVPageClient
            channels={channels}
            currentPlayingIndex={currentIndex}
            contents={[]}
            tippers={[]}
            tipperEvents={[]}
            iTipped={0}
            causes={[]}
            latestContents={[]}
            mostTippedContents={[]}
            selectedTag={null}
            tagFilteredContents={[]}
          />
        </div>
      )}
    </>
  );
}
