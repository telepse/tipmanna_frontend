"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getAllFeaturedContentsAction } from "@/actions/contents";
import TvPlayer from "@/components/tv/tv-player";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { useTvPlayerControls } from "@/hooks/use-tv-player-controls";

import { WatchTransportBar } from "./watch-transport-bar";

type ExploreClip = {
  id: string;
  title: string;
  url: string;
};

export function WatchExploreTheater() {
  const playerRef =
    useRef<import("@/components/tv/tv-player").TvPlayerRef>(null);
  const [clips, setClips] = useState<ExploreClip[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [, setPlayerPlayingState] = useState(false);

  const enterLocalMode = useCallback((_reason: string) => {}, []);
  const mode = "LOCAL" as const;

  const {
    isPlaying,
    isMuted,
    togglePlayPause,
    toggleMute,
    onPlayerReady,
    notifyPlayerPlaying,
    notifyPlayerPaused,
    syncFromPlayer,
  } = useTvPlayerControls({
    playerRef,
    mode,
    enterLocalMode,
    setPlayerPlayingState,
  });

  const loadClips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllFeaturedContentsAction();
      const raw = (res.data ?? []) as Array<{
        id?: string;
        title?: string;
        url?: string;
      }>;
      const playable = raw
        .map(row => ({
          id: String(row.id ?? ""),
          title: row.title?.trim() || "Featured clip",
          url: row.url?.trim() ?? "",
        }))
        .filter(row => row.id && row.url && extractYoutubeID(row.url));
      setClips(playable);
      setIndex(0);
    } catch {
      setError("Could not load explore clips.");
      setClips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  const current = clips[index];
  const videoUrl = current?.url ?? "";

  useEffect(() => {
    setIsPlayerLoading(true);
    setCurrentTime(0);
    setDuration(0);
  }, [videoUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player?.isReady()) return;
      const dur = player.getDuration();
      if (dur > 0) setDuration(dur);
      if (!isSeeking) setCurrentTime(player.getCurrentTime());
    }, 250);
    return () => clearInterval(interval);
  }, [isSeeking, videoUrl]);

  const seekTo = (time: number) => {
    setCurrentTime(time);
    const player = playerRef.current;
    if (player?.isReady()) player.seekTo(time, true);
  };

  const goFeatured = () => {
    setIndex(0);
    const player = playerRef.current;
    if (player?.isReady()) {
      player.seekTo(0, true);
      void player.play?.();
    }
  };

  const stepClip = (delta: number) => {
    if (!clips.length) return;
    setIndex(prev => (prev + delta + clips.length) % clips.length);
  };

  const handleStop = useCallback(() => {
    const player = playerRef.current;
    if (!player?.isReady()) return;
    try {
      player.pauseProgrammatic?.();
    } catch {
      /* pause only — keep iframe mounted */
    }
  }, [playerRef]);

  const seekBarMax = duration > 0 ? duration : 1;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[2vmin] text-white/70">
        Loading explore…
      </div>
    );
  }

  if (error || !clips.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg text-white/80">
          {error ?? "No featured clips available."}
        </p>
        <button
          type="button"
          className="watch-transport-btn rounded-lg bg-white px-6 py-3 text-black"
          onClick={() => void loadClips()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative aspect-video w-full flex-1 bg-black">
        {isPlayerLoading && videoUrl ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white">
            Loading clip…
          </div>
        ) : null}
        {videoUrl ? (
          <TvPlayer
            key={videoUrl}
            ref={playerRef}
            videoUrl={videoUrl}
            externallyControlled
            autoplay
            onReady={() => {
              setIsPlayerLoading(false);
              onPlayerReady();
            }}
            onPlay={() => {
              setIsPlayerLoading(false);
              notifyPlayerPlaying();
              syncFromPlayer();
            }}
            onPause={() => notifyPlayerPaused()}
            onUserPause={() => enterLocalMode("pause")}
            onUserSeek={() => enterLocalMode("seek")}
            cover
          />
        ) : null}
        <div className="absolute bottom-[2vmin] left-[2vmin] z-20 max-w-[80%] truncate text-[2vmin] text-white">
          {current?.title}
        </div>
      </div>
      <WatchTransportBar
        isPlaying={isPlaying}
        isMuted={isMuted}
        onPlayPause={togglePlayPause}
        onStop={handleStop}
        onMute={toggleMute}
        modeLabel="Explore"
        showLive
        onLive={goFeatured}
        seekSlot={
          <input
            type="range"
            min={0}
            max={seekBarMax}
            step={1}
            value={Math.min(currentTime, seekBarMax)}
            className="watch-transport-btn w-[min(40vw,480px)] accent-white"
            aria-label="Seek"
            onPointerDown={() => setIsSeeking(true)}
            onPointerUp={() => setIsSeeking(false)}
            onChange={e => seekTo(Number(e.target.value))}
          />
        }
        extra={
          <div className="flex gap-2">
            <button
              type="button"
              className="watch-transport-btn rounded-lg bg-white/10 px-4 py-3 text-white"
              onClick={() => stepClip(-1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="watch-transport-btn rounded-lg bg-white/10 px-4 py-3 text-white"
              onClick={() => stepClip(1)}
            >
              Next
            </button>
          </div>
        }
      />
    </div>
  );
}
