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
import { useTvEventTipCatalog } from "@/hooks/use-tv-event-tip-catalog";
import { useTvEnforcementDeepLink } from "@/hooks/use-tv-enforcement-deep-link";
import { resolveTvScheduleEventId } from "@/lib/resolve-tv-schedule-event-id";
import { tvTrace } from "@/lib/tvDebugLog";
import { schedulePostTtfvIdle } from "@/lib/tv-post-ttfv-idle";
import { prefetchTvScheduleTips } from "@/lib/drawer-prefetch-cache";
import { useTvLazyCharacters } from "@/hooks/use-tv-lazy-characters";
import { useTvSurfaceMode } from "@/hooks/use-tv-surface-mode";
import { TvLooperSkeleton, TvRightPanelSkeleton } from "./tv-loading-skeletons";

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

interface Props {
  channels?: Channel[];
  characters: Character[];
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
    schedulePlayingSlot,
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

  const { ready: surfaceReady, isPhone: isPhoneSurface } = useTvSurfaceMode();

  useTvEnforcementDeepLink({
    tvReady,
    itemsLength: items.length,
    scheduleSourceCommunityId,
    playEnforcementProgram,
  });

  useEffect(() => {
    if (!isPhoneSurface) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isPhoneSurface]);

  const [activeTab, setActiveTab] = useState<"playlist" | "tips" | "programs">(
    "playlist"
  );

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

  const tipDrawerEventId = resolveTvScheduleEventId(currentScheduleItem);

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

  const {
    tippingCharacters: tippingCharactersForDrawer,
    characterSets: characterSetsForDrawer,
  } = useTvEventTipCatalog(playingVideoKey ? tipDrawerEventId : "");

  useEffect(() => {
    if (!items.length || !tipDrawerEventId) return;
    schedulePostTtfvIdle(() => {
      prefetchTvScheduleTips(items, currentIndex, 3);
    });
  }, [items, currentIndex, tipDrawerEventId, playingVideoKey]);

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

  useEffect(() => {
    if (
      schedulePlayingSlot?.scope !== "active" ||
      schedulePlayingSlot.source !== "preview"
    ) {
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, [
    schedulePlayingSlot?.scope === "active" ? schedulePlayingSlot.source : null,
    schedulePlayingSlot?.scope === "active"
      ? schedulePlayingSlot.rowIndex
      : null,
  ]);

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

      {!surfaceReady ? (
        <div className="mx-auto w-full max-w-6xl px-2 pt-20 pb-28">
          <TvLooperSkeleton layout="compact" />
          <div className="mt-4">
            <TvRightPanelSkeleton layout="mobile" />
          </div>
        </div>
      ) : null}

      {surfaceReady && !isPhoneSurface ? (
        <TvWebExperience {...sharedShellProps} />
      ) : null}

      {surfaceReady && isPhoneSurface ? (
        <div className="w-full">
          <TvInteractiveShell
            {...sharedShellProps}
            variant="mobile"
          />
        </div>
      ) : null}

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
