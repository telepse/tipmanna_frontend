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
import {
  isInsidePlayerAudioIntentGrace,
  markPlayerAudioIntentGrace,
  shouldSuppressPlayerMuteSync,
} from "@/lib/player-audio-intent";
import { safeYoutubeCall } from "@/lib/tv/youtube-player-safe";

const RECONCILE_MS = 500;

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
  const pendingMuteRef = useRef<boolean | null>(null);
  const pendingPlayRef = useRef<boolean | null>(null);

  const applyMuteToPlayer = useCallback(
    (muted: boolean) => {
      const player = playerRef.current;
      if (!player?.isReady()) return false;
      safeYoutubeCall(() => {
        if (muted) {
          player.mute();
        } else {
          player.unmute();
          player.setVolume(100);
        }
      }, undefined);
      return true;
    },
    [playerRef]
  );

  const markUserIntent = useCallback(() => {
    markPlayerAudioIntentGrace(intentGraceUntilRef);
  }, []);

  useEffect(() => {
    setPlayerPlayingState(isPlaying);
  }, [isPlaying, setPlayerPlayingState]);

  useEffect(() => {
    if (!applyMuteToPlayer(isMuted)) {
      pendingMuteRef.current = isMuted;
      return;
    }
    pendingMuteRef.current = null;
  }, [applyMuteToPlayer, isMuted, playerRef]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (isInsidePlayerAudioIntentGrace(intentGraceUntilRef)) return;
      const player = playerRef.current;
      if (!player?.isReady()) return;
      safeYoutubeCall(() => {
        const state = player.getPlayerState();
        setIsPlaying(state === "PLAYING" || state === "BUFFERING");
        const playerMuted = player.isMuted();
        const prefMuted = readTvMutePref();
        if (shouldSuppressPlayerMuteSync(playerMuted, prefMuted)) {
          return;
        }
        setIsMuted(playerMuted);
      }, undefined);
    }, RECONCILE_MS);

    return () => window.clearInterval(interval);
  }, [playerRef]);

  const syncFromPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player?.isReady()) return;
    safeYoutubeCall(() => {
      player.syncMuteFromPlayer?.();
      const playerMuted = player.isMuted();
      const prefMuted = readTvMutePref();
      if (!shouldSuppressPlayerMuteSync(playerMuted, prefMuted)) {
        setIsMuted(playerMuted);
      }
      const state = player.getPlayerState();
      setIsPlaying(state === "PLAYING" || state === "BUFFERING");
    }, undefined);
  }, [playerRef]);

  const onPlayerReady = useCallback(() => {
    const pending = pendingMuteRef.current;
    const targetMuted = pending ?? isMuted;
    if (pending != null) {
      pendingMuteRef.current = null;
      setIsMuted(targetMuted);
      writeTvMutePref(targetMuted);
    }
    safeYoutubeCall(() => {
      const player = playerRef.current;
      player?.syncMuteFromPlayer?.();
      if (player?.isReady()) {
        if (targetMuted) {
          player.mute();
        } else {
          player.unmute();
          player.setVolume(100);
        }
      }
    }, undefined);
    syncFromPlayer();

    const pendingPlay = pendingPlayRef.current;
    if (pendingPlay != null) {
      pendingPlayRef.current = null;
      const player = playerRef.current;
      if (player?.isReady()) {
        if (pendingPlay) {
          safeYoutubeCall(() => player.play(), undefined);
          setIsPlaying(true);
        } else {
          safeYoutubeCall(() => player.pause(), undefined);
          setIsPlaying(false);
        }
      }
    }
  }, [isMuted, playerRef, syncFromPlayer]);

  const togglePlayPause = useCallback(() => {
    markUserIntent();
    const player = playerRef.current;
    if (!player?.isReady()) {
      pendingPlayRef.current = !isPlaying;
      return;
    }
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
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    writeTvMutePref(nextMuted);
    const player = playerRef.current;
    if (!player?.isReady()) {
      pendingMuteRef.current = nextMuted;
      return;
    }
    if (nextMuted) {
      safeYoutubeCall(() => player.mute(), undefined);
    } else {
      unmuteOnly(player, "TvLooper.toggleMute");
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
