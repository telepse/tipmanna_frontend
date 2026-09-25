"use client";

import type { RoomCharacter } from "@/types";
import type { PaymentSurface } from "@/lib/analytics-types";

import { TvLooper } from "./tv-looper";

/**
 * Wide-surface TV looper for tablet/desktop grid column.
 * Delegates to TvLooper with layout="wideInline" (single playback tree).
 */
export const WebTvLooper = ({
  characters,
  playerLayout = "wide",
  analyticsSurface = "tv_looper",
  onContinueCommentToTip,
  onEngage,
  onTipFeatured,
  sectionCtaLabel,
  pageDrawerOpen = false,
  onRegisterExitFull,
  commentDrawerVideoTitle,
  commentDrawerVideoDescription,
  onGoLive,
  onSwitchToLocal,
  onOpenPreviewPlaylist,
  onOpenSchedule,
}: {
  characters: RoomCharacter[];
  /** compact: legacy column; wide: full-width player for desktop /tv */
  playerLayout?: "compact" | "wide";
  /** Defaults to tv_looper */
  analyticsSurface?: PaymentSurface;
  onEngage?: () => void;
  onTipFeatured?: (cardId: string) => void;
  sectionCtaLabel?: string;
  pageDrawerOpen?: boolean;
  onRegisterExitFull?: (exitFull: (() => void) | null) => void;
  onContinueCommentToTip?: () => void;
  commentDrawerVideoTitle?: string;
  commentDrawerVideoDescription?: string;
  onGoLive?: () => void;
  onSwitchToLocal?: () => void;
  onOpenPreviewPlaylist?: () => void;
  onOpenSchedule?: () => void;
}) => (
  <TvLooper
    characters={characters}
    layout="wideInline"
    playerLayout={playerLayout}
    analyticsSurface={analyticsSurface}
    onContinueCommentToTip={onContinueCommentToTip}
    onEngage={onEngage}
    onTipFeatured={onTipFeatured}
    sectionCtaLabel={sectionCtaLabel}
    pageDrawerOpen={pageDrawerOpen}
    onRegisterExitFull={onRegisterExitFull}
    commentDrawerVideoTitle={commentDrawerVideoTitle}
    commentDrawerVideoDescription={commentDrawerVideoDescription}
    onGoLive={onGoLive}
    onSwitchToLocal={onSwitchToLocal}
    onOpenPreviewPlaylist={onOpenPreviewPlaylist}
    onOpenSchedule={onOpenSchedule}
  />
);
