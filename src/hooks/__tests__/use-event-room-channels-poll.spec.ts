/**
 * @vitest-environment happy-dom
 */
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

const getEventChannels = vi.fn();

vi.mock("@/actions/events", () => ({
  getEventChannels: (...args: unknown[]) => getEventChannels(...args),
}));

import { useEventRoomChannelsPoll } from "@/hooks/use-event-room-channels-poll";

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function channelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ch-1",
    url: "https://cdn.example/a.m3u8",
    title: "Main",
    isDefault: true,
    ...overrides,
  };
}

type HarnessProps = {
  eventId: string | undefined;
  intervalMs?: number;
  onChannels: (channels: EventRoomVideoChannel[]) => void;
};

function PollHarness({ eventId, intervalMs, onChannels }: HarnessProps) {
  useEventRoomChannelsPoll(eventId, onChannels, intervalMs);
  return null;
}

function renderPoll(props: HarnessProps) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  const render = (next: HarnessProps) => {
    act(() => {
      root.render(createElement(PollHarness, next));
    });
  };

  render(props);

  return {
    rerender: render,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

/** Remount-friendly harness that can change eventId via state. */
function StatefulPollHarness({
  initialEventId,
  intervalMs,
  onChannels,
  eventIdRef,
}: {
  initialEventId: string;
  intervalMs?: number;
  onChannels: (channels: EventRoomVideoChannel[]) => void;
  eventIdRef: { current: (id: string) => void };
}) {
  const [eventId, setEventId] = useState(initialEventId);
  eventIdRef.current = setEventId;
  useEventRoomChannelsPoll(eventId, onChannels, intervalMs);
  return null;
}

function renderStatefulPoll(opts: {
  initialEventId: string;
  intervalMs?: number;
  onChannels: (channels: EventRoomVideoChannel[]) => void;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const eventIdRef: { current: (id: string) => void } = {
    current: () => undefined,
  };

  act(() => {
    root.render(
      createElement(StatefulPollHarness, {
        ...opts,
        eventIdRef,
      })
    );
  });

  return {
    setEventId: (id: string) => {
      act(() => {
        eventIdRef.current(id);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useEventRoomChannelsPoll (Wave 2A Task A)", () => {
  const INTERVAL = 15_000;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    getEventChannels.mockReset();
    setVisibility("visible");
    getEventChannels.mockResolvedValue({
      success: true,
      data: [channelRow()],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
    setVisibility("visible");
  });

  it("polls on the visible interval and delivers normalized channels", async () => {
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    expect(getEventChannels).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });

    expect(getEventChannels).toHaveBeenCalledTimes(1);
    expect(getEventChannels).toHaveBeenCalledWith("evt-1");
    expect(onChannels).toHaveBeenCalledTimes(1);
    expect(onChannels.mock.calls[0][0]).toEqual([
      {
        id: "ch-1",
        url: "https://cdn.example/a.m3u8",
        title: "Main",
        isDefault: true,
        durationSeconds: undefined,
        mediaSource: undefined,
      },
    ]);

    unmount();
  });

  it("skips interval polling while the tab is hidden", async () => {
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    setVisibility("hidden");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL * 3);
    });

    expect(getEventChannels).not.toHaveBeenCalled();
    expect(onChannels).not.toHaveBeenCalled();

    unmount();
  });

  it("triggers exactly one prompt refresh when becoming visible", async () => {
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    setVisibility("hidden");
    expect(getEventChannels).not.toHaveBeenCalled();

    await act(async () => {
      setVisibility("visible");
      await Promise.resolve();
    });

    expect(getEventChannels).toHaveBeenCalledTimes(1);
    expect(onChannels).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("does not start a second refresh while one is in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });

    getEventChannels.mockImplementation(async () => {
      await gate;
      return { success: true, data: [channelRow()] };
    });

    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    // Start interval refresh
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });
    expect(getEventChannels).toHaveBeenCalledTimes(1);

    // Visibility resume while in flight must not stack
    await act(async () => {
      setVisibility("hidden");
      setVisibility("visible");
      await Promise.resolve();
    });
    expect(getEventChannels).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await Promise.resolve();
    });

    expect(onChannels).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("rapid hide/show does not create refresh storms", async () => {
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    await act(async () => {
      setVisibility("hidden");
      setVisibility("visible");
      setVisibility("hidden");
      setVisibility("visible");
      setVisibility("hidden");
      setVisibility("visible");
      await Promise.resolve();
    });

    // First visible refresh in flight blocks subsequent resumes
    expect(getEventChannels).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(onChannels).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("cleans up interval and listeners on unmount (no late delivery)", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    getEventChannels.mockImplementation(async () => {
      await gate;
      return { success: true, data: [channelRow({ id: "late" })] };
    });

    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });
    expect(getEventChannels).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      release();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(INTERVAL * 2);
    });

    expect(onChannels).not.toHaveBeenCalled();
    expect(getEventChannels).toHaveBeenCalledTimes(1);
  });

  it("switches eventId and does not apply stale results", async () => {
    let releaseA!: () => void;
    const gateA = new Promise<void>(resolve => {
      releaseA = resolve;
    });

    getEventChannels.mockImplementation(async (id: string) => {
      if (id === "evt-a") {
        await gateA;
        return { success: true, data: [channelRow({ id: "from-a" })] };
      }
      return { success: true, data: [channelRow({ id: "from-b" })] };
    });

    const onChannels = vi.fn();
    const { setEventId, unmount } = renderStatefulPoll({
      initialEventId: "evt-a",
      intervalMs: INTERVAL,
      onChannels,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });
    expect(getEventChannels).toHaveBeenCalledWith("evt-a");

    setEventId("evt-b");

    await act(async () => {
      releaseA();
      await Promise.resolve();
    });
    expect(onChannels).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });
    expect(getEventChannels).toHaveBeenCalledWith("evt-b");
    expect(onChannels).toHaveBeenCalledTimes(1);
    expect(onChannels.mock.calls[0][0][0].id).toBe("from-b");

    unmount();
  });

  it("does not call onChannels for failed responses", async () => {
    getEventChannels.mockResolvedValue({
      success: false,
      data: null,
    });
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });

    expect(getEventChannels).toHaveBeenCalledTimes(1);
    expect(onChannels).not.toHaveBeenCalled();
    unmount();
  });

  it("does not call onChannels for empty channel lists", async () => {
    getEventChannels.mockResolvedValue({ success: true, data: [] });
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });

    expect(onChannels).not.toHaveBeenCalled();
    unmount();
  });

  it("filters restricted rows and maps mediaSource/duration", async () => {
    getEventChannels.mockResolvedValue({
      success: true,
      data: [
        { restricted: true, id: "nope" },
        {
          id: 42,
          url: "https://cdn.example/b.m3u8",
          durationSeconds: 90,
          mediaSource: "native",
          isDefault: false,
        },
      ],
    });
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "evt-1",
      intervalMs: INTERVAL,
      onChannels,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });

    expect(onChannels).toHaveBeenCalledTimes(1);
    expect(onChannels.mock.calls[0][0]).toEqual([
      {
        id: "42",
        url: "https://cdn.example/b.m3u8",
        title: undefined,
        isDefault: false,
        durationSeconds: 90,
        mediaSource: "native",
      },
    ]);
    unmount();
  });

  it("does not start polling when eventId is empty", async () => {
    const onChannels = vi.fn();
    const { unmount } = renderPoll({
      eventId: "   ",
      intervalMs: INTERVAL,
      onChannels,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
      setVisibility("visible");
    });

    expect(getEventChannels).not.toHaveBeenCalled();
    unmount();
  });
});
