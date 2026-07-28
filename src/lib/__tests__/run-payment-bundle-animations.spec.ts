import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/realtime-telemetry", () => ({
  logRealtimeTelemetry: vi.fn(),
}));

vi.mock("@/lib/reward-overlays/mount-web-reward-layers", () => ({
  startPaymentRewardOverlays: vi.fn(),
}));

vi.mock("@/lib/tip-animation-characters", () => ({
  resolveStyleCharactersForTip: vi.fn(),
  resolvePaymentCharactersForTip: vi.fn(),
}));

const createAnimationFromStyleMock = vi.fn(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  finished: Promise.resolve(),
}));

vi.mock("@/lib/factory-to-style", () => ({
  createAnimationFromStyle: () => createAnimationFromStyleMock(),
}));

vi.mock("@/lib/payment-playback-budget", () => ({
  getSegmentEndMs: vi.fn(() => Number.MAX_SAFE_INTEGER),
  shouldSkipPaymentSegment: vi.fn(() => false),
  noopPaymentAnimationHandle: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    finished: Promise.resolve(),
  })),
}));

vi.mock("@/lib/wrapPaymentAnimation", () => ({
  wrapPaymentAnimation: (factory: () => unknown) => async () => {
    factory();
  },
}));

import {
  resolvePaymentCharactersForTip,
  resolveStyleCharactersForTip,
} from "@/lib/tip-animation-characters";
import { enqueuePaymentBundleForValidatedTip } from "@/lib/run-payment-bundle-animations";
import {
  createAnimationQueue,
  type AnimationQueueTask,
} from "@/lib/animation-queue-core";
import {
  clearPlaybackKeyState,
  getPlaybackKeyState,
  reservePlaybackKey,
} from "@/lib/playback-key-lifecycle";

const validCharacter: RoomCharacter = {
  id: "c1",
  name: "Heart",
  styleName: "Confetti",
  iconUrl: "/heart.png",
  price: 1,
};

const invalidCharacter = {
  name: "Love",
  styleName: "Confe",
  iconUrl: "/love.png",
};

const emptySummary = {
  expectedCount: 1,
  serverResolvedCount: 0,
  localFallbackCount: 0,
  runnableCount: 0,
  rejectedCount: 0,
  unresolvedCount: 0,
  missingIconCount: 0,
  entries: [],
};

function mockResolvedCharacters(
  characters: Array<{ name: string; styleName: string; iconUrl: string }>
) {
  vi.mocked(resolvePaymentCharactersForTip).mockReturnValue({
    characters,
    summary: {
      ...emptySummary,
      expectedCount: characters.length,
      runnableCount: characters.length,
      localFallbackCount: characters.length,
      entries: characters.map(c => ({
        name: c.name,
        outcome: "local_fallback" as const,
        styleName: c.styleName,
        iconUrl: c.iconUrl,
        character: c,
      })),
    },
  });
  vi.mocked(resolveStyleCharactersForTip).mockReturnValue(characters);
}

const bundle: TipAnimationEvent = {
  id: "bundle-1",
  seq: 1,
  eventId: "evt-1",
  serverTs: Date.now(),
  selectedTips: ["Heart"],
  resolvedTips: [],
  playbackEndsAt: Date.now() + 60_000,
  amount: 5,
  rewardTurbo: false,
  rewardGalaxy: false,
};

async function drain(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (condition()) return;
    await drain();
  }
  throw new Error("timeout");
}

describe("run-payment-bundle-animations E3A unknown style", () => {
  beforeEach(() => {
    clearPlaybackKeyState();
    createAnimationFromStyleMock.mockClear();
    vi.mocked(resolvePaymentCharactersForTip).mockReset();
    vi.mocked(resolveStyleCharactersForTip).mockReset();
  });

  it("Test A — invalid Confe character is rejected before reservation", () => {
    mockResolvedCharacters([invalidCharacter]);
    const enqueue = vi.fn(() => ({ accepted: true as const }));

    const result = enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map(),
      buildDedupeKey: (name: string) => `bundle-1-${name}`,
      enqueue,
      surface: "room_messages",
    });

    expect(result.rejectedCount).toBe(1);
    expect(result.runnableCount).toBe(0);
    expect(result.enqueued).toBe(false);
    expect(result.rejections[0]?.reason).toBe("unknown_style");
    expect(getPlaybackKeyState("bundle-1-Love")).toBe("unseen");
    expect(enqueue).not.toHaveBeenCalled();
    expect(createAnimationFromStyleMock).not.toHaveBeenCalled();
  });

  it("Test B — corrected valid retry after invalid rejection", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });
    const enqueue = (tasks: AnimationQueueTask[]) => queue.enqueue(tasks);

    vi.mocked(resolvePaymentCharactersForTip).mockReturnValueOnce({
      characters: [invalidCharacter],
      summary: { ...emptySummary, expectedCount: 1, entries: [] },
    });
    vi.mocked(resolveStyleCharactersForTip).mockReturnValueOnce([
      invalidCharacter,
    ]);
    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map(),
      buildDedupeKey: (name: string) => `retry-${name}`,
      enqueue,
      surface: "room_messages",
    });
    expect(getPlaybackKeyState("retry-Love")).toBe("unseen");

    mockResolvedCharacters([
      { name: "Love", styleName: "Confetti", iconUrl: "/love.png" },
    ]);
    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map(),
      buildDedupeKey: (name: string) => `retry-${name}`,
      enqueue,
      surface: "room_messages",
    });

    await waitFor(() => getPlaybackKeyState("retry-Love") === "committed");
    expect(createAnimationFromStyleMock).toHaveBeenCalled();
  });

  it("Test C — mixed valid, invalid, valid characters queue two tasks in order", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });
    const taskOrder: string[] = [];
    const enqueue = (tasks: AnimationQueueTask[]) => {
      taskOrder.push(...tasks.map(t => t.playbackKey));
      return queue.enqueue(
        tasks.map(t => ({
          ...t,
          run: async () => {
            await t.run();
          },
        }))
      );
    };

    mockResolvedCharacters([
      { name: "A", styleName: "Confetti", iconUrl: "/a.png" },
      { name: "B", styleName: "Confe", iconUrl: "/b.png" },
      { name: "C", styleName: "Burst", iconUrl: "/c.png" },
    ]);

    const result = enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map(),
      buildDedupeKey: (name: string) => `mix-${name}`,
      enqueue,
      surface: "room_messages",
    });

    expect(result.runnableCount).toBe(2);
    expect(result.rejectedCount).toBe(1);
    expect(taskOrder).toEqual(["mix-A", "mix-C"]);
    expect(getPlaybackKeyState("mix-B")).toBe("unseen");
    await waitFor(
      () =>
        getPlaybackKeyState("mix-A") === "committed" &&
        getPlaybackKeyState("mix-C") === "committed"
    );
    expect(createAnimationFromStyleMock).toHaveBeenCalledTimes(2);
  });

  it("Test D — all invalid characters do not call queue", () => {
    mockResolvedCharacters([
      { name: "A", styleName: "Confe", iconUrl: "/a.png" },
      { name: "B", styleName: "Shock", iconUrl: "/b.png" },
    ]);
    const enqueue = vi.fn();

    const result = enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map(),
      buildDedupeKey: (name: string) => `all-bad-${name}`,
      enqueue,
    });

    expect(result.enqueued).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
    expect(getPlaybackKeyState("all-bad-A")).toBe("unseen");
    expect(getPlaybackKeyState("all-bad-B")).toBe("unseen");
  });

  it("Test F — duplicate fan-out of invalid bundle never reserves keys", () => {
    mockResolvedCharacters([invalidCharacter]);
    const enqueue = vi.fn();

    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map(),
      buildDedupeKey: (name: string) => `fanout-${name}`,
      enqueue,
    });
    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map(),
      buildDedupeKey: (name: string) => `fanout-${name}`,
      enqueue,
    });

    expect(getPlaybackKeyState("fanout-Love")).toBe("unseen");
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("Test G — valid Confetti payment still reserves, enqueues and commits", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });
    mockResolvedCharacters([validCharacter]);

    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map([[validCharacter.name, validCharacter]]),
      buildDedupeKey: (name: string) => `valid-${name}`,
      enqueue: queue.enqueue.bind(queue),
      surface: "room_messages",
    });

    await waitFor(() => getPlaybackKeyState("valid-Heart") === "committed");
    expect(createAnimationFromStyleMock).toHaveBeenCalled();
    expect(queue.getPendingCount()).toBe(0);
  });
});

describe("run-payment-bundle-animations playback-key integration", () => {
  beforeEach(() => {
    clearPlaybackKeyState();
    mockResolvedCharacters([validCharacter]);
  });

  it("Test B — duplicate bundle delivery enqueues one task before first begins", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });
    let runs = 0;
    const options = {
      data: bundle,
      characterMap: new Map([[validCharacter.name, validCharacter]]),
      buildDedupeKey: (name: string) => `dup-${name}`,
      enqueue: (tasks: AnimationQueueTask[]) => {
        const wrapped = tasks.map(t => ({
          ...t,
          run: async () => {
            runs += 1;
            await t.run();
          },
        }));
        return queue.enqueue(wrapped);
      },
      surface: "room_messages" as const,
    };

    enqueuePaymentBundleForValidatedTip(options);
    enqueuePaymentBundleForValidatedTip(options);

    await waitFor(() => runs === 1);
    expect(getPlaybackKeyState("dup-Heart")).toBe("committed");
  });

  it("Test H — duplicate bundle delivery enqueues one task per playback key", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "room_messages",
    });
    let taskRuns = 0;

    const enqueue = (tasks: AnimationQueueTask[]) => {
      const wrapped = tasks.map(t => ({
        ...t,
        run: async () => {
          taskRuns += 1;
          await t.run();
        },
      }));
      return queue.enqueue(wrapped);
    };

    const options = {
      data: bundle,
      characterMap: new Map([[validCharacter.name, validCharacter]]),
      buildDedupeKey: (name: string) => `bundle-1-${name}`,
      enqueue,
      surface: "room_messages" as const,
    };

    enqueuePaymentBundleForValidatedTip(options);
    enqueuePaymentBundleForValidatedTip(options);

    await waitFor(() => getPlaybackKeyState("bundle-1-Heart") === "committed");
    await waitFor(() => taskRuns === 1);
    expect(reservePlaybackKey("bundle-1-Heart")).toBe(false);
  });

  it("Test I — Event Room and Screen Display retain independent prefixed keys", async () => {
    const roomQueue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "room_messages",
    });
    const screenQueue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "screen_display",
    });

    const roomRuns: string[] = [];
    const screenRuns: string[] = [];

    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map([[validCharacter.name, validCharacter]]),
      buildDedupeKey: (name: string) => `${bundle.id}-${name}`,
      enqueue: tasks => {
        roomRuns.push(...tasks.map(t => t.playbackKey));
        return roomQueue.enqueue(tasks);
      },
      surface: "room_messages",
    });

    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map([[validCharacter.name, validCharacter]]),
      buildDedupeKey: (name: string) => `screen-${bundle.id}-${name}`,
      enqueue: tasks => {
        screenRuns.push(...tasks.map(t => t.playbackKey));
        return screenQueue.enqueue(tasks);
      },
      surface: "screen_display",
    });

    expect(roomRuns).toEqual(["bundle-1-Heart"]);
    expect(screenRuns).toEqual(["screen-bundle-1-Heart"]);
    expect(getPlaybackKeyState("bundle-1-Heart")).toBe("reserved");
    expect(getPlaybackKeyState("screen-bundle-1-Heart")).toBe("reserved");

    await waitFor(
      () =>
        getPlaybackKeyState("bundle-1-Heart") === "committed" &&
        getPlaybackKeyState("screen-bundle-1-Heart") === "committed"
    );
  });
});
