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
  onRegisterExitFull,
  commentDrawerVideoTitle,
  commentDrawerVideoDescription,
}: {
  characters: RoomCharacter[];
  /** compact: legacy column; wide: full-width player for desktop /tv */
  playerLayout?: "compact" | "wide";
  /** Defaults to tv_looper */
  analyticsSurface?: PaymentSurface;
  onEngage?: () => void;
  onRegisterExitFull?: (exitFull: (() => void) | null) => void;
  onContinueCommentToTip?: () => void;
  commentDrawerVideoTitle?: string;
  commentDrawerVideoDescription?: string;
}) => (
  <TvLooper
    characters={characters}
    layout="wideInline"
    playerLayout={playerLayout}
    analyticsSurface={analyticsSurface}
    onContinueCommentToTip={onContinueCommentToTip}
    onEngage={onEngage}
    onRegisterExitFull={onRegisterExitFull}
    commentDrawerVideoTitle={commentDrawerVideoTitle}
    commentDrawerVideoDescription={commentDrawerVideoDescription}
  />
);
