import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/animationDebug", () => ({
  animLog: vi.fn(),
  animWarn: vi.fn(),
}));

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

import {
  createAnimationQueue,
  MAX_QUEUED_BATCHES,
  type AnimationQueueTask,
} from "@/lib/animation-queue-core";
import {
  clearPlaybackKeyState,
  commitPlaybackKey,
  getPlaybackKeyState,
  reservePlaybackKey,
} from "@/lib/playback-key-lifecycle";

function task(
  key: string,
  run: () => Promise<void> = async () => undefined
): AnimationQueueTask {
  return { playbackKey: key, run };
}

async function drainMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 2000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor timeout");
    }
    await drainMicrotasks();
  }
}

describe("animation queue playback-key lifecycle (Phase E2)", () => {
  beforeEach(() => {
    clearPlaybackKeyState();
  });

  it("Test A — successful task reserves, commits on start, and runs", async () => {
    reservePlaybackKey("key-a");
    let cycles = 0;
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "room_messages",
    });

    const result = queue.enqueue([
      task("key-a", async () => {
        cycles += 1;
        await drainMicrotasks();
        cycles += 1;
      }),
    ]);

    expect(result).toEqual({ accepted: true });
    expect(getPlaybackKeyState("key-a")).toBe("reserved");

    await waitFor(() => getPlaybackKeyState("key-a") === "committed");
    await waitFor(() => cycles === 2);
    expect(reservePlaybackKey("key-a")).toBe(false);
  });

  it("Test B — duplicate bundle invocation enqueues one task", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });
    let runs = 0;

    const enqueue = (tasks: AnimationQueueTask[]) => {
      if (getPlaybackKeyState("dup-key") === "committed") {
        return { accepted: true as const };
      }
      if (getPlaybackKeyState("dup-key") !== "unseen") {
        return { accepted: true as const };
      }
      if (!reservePlaybackKey("dup-key")) {
        return { accepted: true as const };
      }
      return queue.enqueue(
        tasks.map(t => ({
          ...t,
          run: async () => {
            runs += 1;
            await t.run();
          },
        }))
      );
    };

    expect(
      enqueue([{ playbackKey: "dup-key", run: async () => undefined }])
    ).toEqual({
      accepted: true,
    });
    expect(
      enqueue([{ playbackKey: "dup-key", run: async () => undefined }])
    ).toEqual({
      accepted: true,
    });

    await waitFor(() => runs === 1);
    await waitFor(() => getPlaybackKeyState("dup-key") === "committed");
  });

  it("Test C — queue disabled releases reservation", () => {
    reservePlaybackKey("key-disabled");
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => false,
    });

    const result = queue.enqueue([task("key-disabled")]);
    expect(result).toEqual({ accepted: false, reason: "disabled" });
    expect(getPlaybackKeyState("key-disabled")).toBe("unseen");
    expect(reservePlaybackKey("key-disabled")).toBe(true);
  });

  it("Test D — queue full releases reservation", () => {
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });

    for (let i = 0; i < MAX_QUEUED_BATCHES; i++) {
      reservePlaybackKey(`pending-${i}`);
      expect(queue.enqueue([task(`pending-${i}`)])).toEqual({ accepted: true });
    }

    reservePlaybackKey("key-full");
    const result = queue.enqueue([task("key-full")]);
    expect(result).toEqual({ accepted: false, reason: "full" });
    expect(getPlaybackKeyState("key-full")).toBe("unseen");
    expect(reservePlaybackKey("key-full")).toBe(true);
  });

  it("Test E — generation invalidation before task start releases reservation", async () => {
    reservePlaybackKey("key-gen");
    let started = false;
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });

    reservePlaybackKey("blocker");
    queue.enqueue([task("blocker", () => new Promise<void>(() => undefined))]);
    expect(
      queue.enqueue([
        task("key-gen", async () => {
          started = true;
        }),
      ])
    ).toEqual({
      accepted: true,
    });

    queue.flush();
    await drainMicrotasks();
    await waitFor(() => getPlaybackKeyState("key-gen") === "unseen");
    expect(started).toBe(false);
    expect(reservePlaybackKey("key-gen")).toBe(true);
  });

  it("Test F — multi-character partial start keeps A committed and releases B", async () => {
    reservePlaybackKey("char-a");
    reservePlaybackKey("char-b");
    let aStarted = false;
    let bStarted = false;

    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
    });

    queue.enqueue([
      task("char-a", async () => {
        aStarted = true;
        await new Promise<void>(() => undefined);
      }),
      task("char-b", async () => {
        bStarted = true;
      }),
    ]);

    await waitFor(() => aStarted);
    expect(getPlaybackKeyState("char-a")).toBe("committed");

    queue.flush();
    await drainMicrotasks();
    await waitFor(() => getPlaybackKeyState("char-b") === "unseen");
    expect(bStarted).toBe(false);
    expect(getPlaybackKeyState("char-a")).toBe("committed");
    expect(reservePlaybackKey("char-b")).toBe(true);
  });

  it("Test G — flush before queued task starts releases reservation", async () => {
    reservePlaybackKey("waiting-key");
    let started = false;
    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "screen_display",
    });

    reservePlaybackKey("blocker-key");
    queue.enqueue([
      task("blocker-key", () => new Promise<void>(() => undefined)),
    ]);
    expect(
      queue.enqueue([
        task("waiting-key", async () => {
          started = true;
        }),
      ])
    ).toEqual({
      accepted: true,
    });

    queue.flush();
    await drainMicrotasks();
    expect(getPlaybackKeyState("waiting-key")).toBe("unseen");
    expect(started).toBe(false);
    expect(reservePlaybackKey("waiting-key")).toBe(true);
  });
});

describe("commitPlaybackKey guard", () => {
  beforeEach(() => {
    clearPlaybackKeyState();
  });

  it("only commits reserved keys", () => {
    expect(commitPlaybackKey("missing")).toBe(false);
    reservePlaybackKey("k1");
    expect(commitPlaybackKey("k1")).toBe(true);
    expect(commitPlaybackKey("k1")).toBe(false);
  });
});
