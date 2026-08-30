/**
 * @vitest-environment happy-dom
 */
import { act, createElement, createRef, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TvPlayerRef } from "@/components/tv/tv-player";
import { useTvPlayerControls } from "@/hooks/use-tv-player-controls";

vi.mock("@/lib/tv-autoplay", () => ({
  readTvMutePref: vi.fn(() => true),
  unmuteOnly: vi.fn(),
  writeTvMutePref: vi.fn(),
}));

import { readTvMutePref, unmuteOnly, writeTvMutePref } from "@/lib/tv-autoplay";

function makePlayer(overrides: Partial<TvPlayerRef> = {}): TvPlayerRef {
  return {
    isReady: () => true,
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    isMuted: () => true,
    syncMuteFromPlayer: vi.fn(),
    setVolume: vi.fn(),
    getCurrentTime: () => 0,
    getDuration: () => 120,
    getPlayerState: () => "PAUSED",
    seekTo: vi.fn(),
    load: vi.fn(),
    ...overrides,
  };
}

type HookResult = ReturnType<typeof useTvPlayerControls>;

function renderControlsHook(opts: {
  player: TvPlayerRef;
  mode?: "GLOBAL" | "LOCAL";
  enterLocalMode?: ReturnType<typeof vi.fn>;
  setPlayerPlayingState?: ReturnType<typeof vi.fn>;
}) {
  const playerRef =
    createRef<TvPlayerRef | null>() as RefObject<TvPlayerRef | null>;
  (playerRef as { current: TvPlayerRef | null }).current = opts.player;

  const enterLocalMode = opts.enterLocalMode ?? vi.fn();
  const setPlayerPlayingState = opts.setPlayerPlayingState ?? vi.fn();

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const result = { current: null as HookResult | null };

  const renderTree = () => {
    root.render(
      createElement(function Harness() {
        result.current = useTvPlayerControls({
          playerRef,
          mode: opts.mode ?? "GLOBAL",
          enterLocalMode,
          setPlayerPlayingState,
        });
        return null;
      })
    );
  };

  act(() => {
    renderTree();
  });

  return {
    result: result as { current: HookResult },
    playerRef,
    enterLocalMode,
    setPlayerPlayingState,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useTvPlayerControls", () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.mocked(readTvMutePref).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("initializes muted from readTvMutePref", () => {
    const { result, unmount } = renderControlsHook({ player: makePlayer() });
    expect(result.current.isMuted).toBe(true);
    unmount();
  });

  it("togglePlayPause plays when paused", () => {
    const player = makePlayer({ getPlayerState: () => "PAUSED" });
    const { result, unmount } = renderControlsHook({ player });

    act(() => {
      result.current.togglePlayPause();
    });

    expect(player.play).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
    unmount();
  });

  it("togglePlayPause pauses when playing", () => {
    const player = makePlayer({ getPlayerState: () => "PLAYING" });
    const { result, unmount } = renderControlsHook({ player });

    act(() => {
      result.current.notifyPlayerPlaying();
    });
    act(() => {
      result.current.togglePlayPause();
    });

    expect(player.pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
    unmount();
  });

  it("toggleMute unmutes and persists preference", () => {
    const player = makePlayer({ isMuted: () => true });
    const { result, unmount } = renderControlsHook({ player });

    act(() => {
      result.current.toggleMute();
    });

    expect(unmuteOnly).toHaveBeenCalledWith(player, "TvLooper.toggleMute");
    expect(writeTvMutePref).toHaveBeenCalledWith(false);
    expect(result.current.isMuted).toBe(false);
    unmount();
  });

  it("reconciles play state from the player every 500ms", () => {
    const player = makePlayer({ getPlayerState: () => "PLAYING" });
    const { result, unmount } = renderControlsHook({ player });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isPlaying).toBe(true);
    unmount();
  });

  it("respects user-intent grace window before reconcile overwrites", () => {
    const player = makePlayer({ getPlayerState: () => "PAUSED" });
    const { result, unmount } = renderControlsHook({ player });

    act(() => {
      result.current.togglePlayPause();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.isPlaying).toBe(false);
    unmount();
  });

  it("syncFromPlayer mirrors session mute pref, not transient player mute", () => {
    const player = makePlayer({
      isMuted: () => true,
      getPlayerState: () => "BUFFERING",
    });
    vi.mocked(readTvMutePref).mockReturnValue(false);
    const { result, unmount } = renderControlsHook({ player });

    act(() => {
      result.current.syncFromPlayer();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isMuted).toBe(false);
    unmount();
  });

  it("reconcile does not flip mute during programmatic player mute", () => {
    vi.mocked(readTvMutePref).mockReturnValue(false);
    const player = makePlayer({
      isMuted: () => true,
      getPlayerState: () => "PLAYING",
    });
    const { result, unmount } = renderControlsHook({ player });

    expect(result.current.isMuted).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.isMuted).toBe(false);
    unmount();
  });

  it("syncFromPlayer mirrors player state", () => {
    const player = makePlayer({
      isMuted: () => false,
      getPlayerState: () => "BUFFERING",
    });
    vi.mocked(readTvMutePref).mockReturnValue(false);
    const { result, unmount } = renderControlsHook({ player });

    act(() => {
      result.current.syncFromPlayer();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isMuted).toBe(false);
    unmount();
  });

  it("stopPlayer enters local mode from GLOBAL and stops playback", () => {
    const player = makePlayer();
    const enterLocalMode = vi.fn();
    const { result, unmount } = renderControlsHook({
      player,
      mode: "GLOBAL",
      enterLocalMode,
    });

    act(() => {
      result.current.stopPlayer();
    });

    expect(enterLocalMode).toHaveBeenCalledWith("manual");
    expect(player.stop).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
    unmount();
  });

  it("propagates isPlaying to setPlayerPlayingState", () => {
    const setPlayerPlayingState = vi.fn();
    const player = makePlayer({ getPlayerState: () => "PLAYING" });
    const { unmount } = renderControlsHook({
      player,
      setPlayerPlayingState,
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(setPlayerPlayingState).toHaveBeenCalledWith(true);
    unmount();
  });

  it("does not throw when reconcile getPlayerState throws", () => {
    const player = makePlayer({
      getPlayerState: () => {
        throw new Error("Cannot read properties of null (reading 'src')");
      },
    });
    const { result, unmount } = renderControlsHook({ player });

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }).not.toThrow();
    expect(result.current.isPlaying).toBe(false);
    unmount();
  });
});
