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
}));

vi.mock("@/lib/factory-to-style", () => ({
  createAnimationFromStyle: vi.fn(),
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

import { resolveStyleCharactersForTip } from "@/lib/tip-animation-characters";
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

const character: RoomCharacter = {
  id: "c1",
  name: "Heart",
  styleName: "Confetti",
  iconUrl: "/heart.png",
  price: 1,
};

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

describe("run-payment-bundle-animations playback-key integration", () => {
  beforeEach(() => {
    clearPlaybackKeyState();
    vi.mocked(resolveStyleCharactersForTip).mockReturnValue([character]);
  });

  it("Test B — duplicate bundle delivery enqueues one task before first begins", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });
    let runs = 0;
    const options = {
      data: bundle,
      characterMap: new Map([[character.name, character]]),
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
      characterMap: new Map([[character.name, character]]),
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
      characterMap: new Map([[character.name, character]]),
      buildDedupeKey: (name: string) => `${bundle.id}-${name}`,
      enqueue: tasks => {
        roomRuns.push(...tasks.map(t => t.playbackKey));
        return roomQueue.enqueue(tasks);
      },
      surface: "room_messages",
    });

    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map([[character.name, character]]),
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
