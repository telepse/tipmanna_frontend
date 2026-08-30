"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { TvPlayerRef } from "@/components/tv/tv-player";
import { readTvMutePref, unmuteOnly, writeTvMutePref } from "@/lib/tv-autoplay";
import { safeYoutubeCall } from "@/lib/tv/youtube-player-safe";

const RECONCILE_MS = 500;
const USER_INTENT_GRACE_MS = 1_000;

type Mode = "GLOBAL" | "LOCAL";

export function useTvPlayerControls(opts: {
  playerRef: RefObject<TvPlayerRef | null>;
  mode: Mode;
  enterLocalMode: (reason: string, index?: number) => void;
  setPlayerPlayingState: (playing: boolean) => void;
}) {
  const { playerRef, mode, enterLocalMode, setPlayerPlayingState } = opts;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => readTvMutePref());
  const intentGraceUntilRef = useRef(0);

  const markUserIntent = useCallback(() => {
    intentGraceUntilRef.current = Date.now() + USER_INTENT_GRACE_MS;
  }, []);

  useEffect(() => {
    setPlayerPlayingState(isPlaying);
  }, [isPlaying, setPlayerPlayingState]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.isReady()) return;

    safeYoutubeCall(() => {
      if (isMuted) {
        player.mute();
      } else {
        player.unmute();
        player.setVolume(100);
      }
    }, undefined);
  }, [isMuted, playerRef]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Date.now() < intentGraceUntilRef.current) return;
      const player = playerRef.current;
      if (!player?.isReady()) return;
      safeYoutubeCall(() => {
        const state = player.getPlayerState();
        setIsPlaying(state === "PLAYING" || state === "BUFFERING");
      }, undefined);
    }, RECONCILE_MS);

    return () => window.clearInterval(interval);
  }, [playerRef]);

  const syncFromPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player?.isReady()) return;
    safeYoutubeCall(() => {
      player.syncMuteFromPlayer?.();
      setIsMuted(readTvMutePref());
      const state = player.getPlayerState();
      setIsPlaying(state === "PLAYING" || state === "BUFFERING");
    }, undefined);
  }, [playerRef]);

  const onPlayerReady = useCallback(() => {
    const player = playerRef.current;
    safeYoutubeCall(() => {
      player?.syncMuteFromPlayer?.();
      if (player?.isReady() && isMuted) {
        player.mute();
      }
    }, undefined);
    syncFromPlayer();
  }, [isMuted, playerRef, syncFromPlayer]);

  const togglePlayPause = useCallback(() => {
    markUserIntent();
    const player = playerRef.current;
    if (!player?.isReady()) return;
    if (isPlaying) {
      safeYoutubeCall(() => player.pause(), undefined);
      setIsPlaying(false);
    } else {
      safeYoutubeCall(() => player.play(), undefined);
      setIsPlaying(true);
    }
  }, [isPlaying, markUserIntent, playerRef]);

  const toggleMute = useCallback(() => {
    markUserIntent();
    const player = playerRef.current;
    if (!player?.isReady()) return;
    if (isMuted) {
      unmuteOnly(player, "TvLooper.toggleMute");
      setIsMuted(false);
      writeTvMutePref(false);
    } else {
      safeYoutubeCall(() => player.mute(), undefined);
      setIsMuted(true);
      writeTvMutePref(true);
    }
  }, [isMuted, markUserIntent, playerRef]);

  const stopPlayer = useCallback(() => {
    markUserIntent();
    const player = playerRef.current;
    if (!player) return;
    if (mode === "GLOBAL") enterLocalMode("manual");
    safeYoutubeCall(() => player.stop(), undefined);
    setIsPlaying(false);
  }, [enterLocalMode, markUserIntent, mode, playerRef]);

  const onPlayerPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const onPlayerPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    togglePlayPause,
    toggleMute,
    stopPlayer,
    onPlayerReady,
    notifyPlayerPlaying: onPlayerPlay,
    notifyPlayerPaused: onPlayerPause,
    syncFromPlayer,
  };
}
