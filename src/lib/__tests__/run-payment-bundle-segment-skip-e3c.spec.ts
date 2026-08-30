import { describe, expect, it, vi, beforeEach } from "vitest";
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

const wrapPaymentAnimationMock = vi.fn(
  (_factory: () => unknown) => async () => undefined
);

vi.mock("@/lib/wrapPaymentAnimation", () => ({
  wrapPaymentAnimation: (factory: () => unknown) =>
    wrapPaymentAnimationMock(factory),
}));

vi.mock("@/lib/factory-to-style", () => ({
  createAnimationFromStyle: vi.fn(),
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
} from "@/lib/playback-key-lifecycle";

const validCharacter: RoomCharacter = {
  id: "c1",
  name: "Heart",
  styleName: "Confetti",
  iconUrl: "/heart.png",
  price: 1,
};

const bundle: TipAnimationEvent = {
  id: "bundle-segment-skip",
  seq: 1,
  eventId: "evt-1",
  serverTs: Date.now() - 60_000,
  playbackEndsAt: Date.now() - 30_000,
  selectedTips: ["Heart"],
  resolvedTips: [],
};

describe("run-payment-bundle-animations segment skip (Phase E3C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPlaybackKeyState();
    vi.mocked(resolvePaymentCharactersForTip).mockReturnValue({
      characters: [
        {
          name: validCharacter.name,
          iconUrl: validCharacter.iconUrl,
          styleName: validCharacter.styleName,
        },
      ],
      summary: {
        expectedCount: 1,
        serverResolvedCount: 0,
        localFallbackCount: 1,
        runnableCount: 1,
        rejectedCount: 0,
        unresolvedCount: 0,
        missingIconCount: 0,
        entries: [],
      },
    });
    vi.mocked(resolveStyleCharactersForTip).mockReturnValue([
      {
        name: validCharacter.name,
        iconUrl: validCharacter.iconUrl,
        styleName: validCharacter.styleName,
      },
    ]);
  });

  it("skips wrapPaymentAnimation when segment budget expired", async () => {
    const traces: string[] = [];
    const { tracePaymentAnimation } = await import(
      "@/lib/payment-animation-trace"
    );
    vi.mocked(tracePaymentAnimation).mockImplementation(payload => {
      traces.push(payload.stage);
    });

    const tasks: AnimationQueueTask[] = [];
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "room_messages",
    });

    const originalEnqueue = queue.enqueue.bind(queue);
    vi.spyOn(queue, "enqueue").mockImplementation(tasksArg => {
      tasks.push(...tasksArg);
      return originalEnqueue(tasksArg);
    });

    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map([[validCharacter.name, validCharacter]]),
      buildDedupeKey: name => `${bundle.id}-${name}`,
      enqueue: tasksArg => queue.enqueue(tasksArg),
      surface: "room_messages",
    });

    expect(wrapPaymentAnimationMock).not.toHaveBeenCalled();
    expect(traces).toContain("payment_segment_budget_skipped");
    expect(tasks).toHaveLength(0);
    expect(getPlaybackKeyState(`${bundle.id}-Heart`)).toBe("unseen");
  });
});
