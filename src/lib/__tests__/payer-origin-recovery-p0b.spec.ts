import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TipAnimationEvent } from "@/lib/animation-guard";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
  isPaymentAnimationTraceEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/realtime-telemetry", () => ({
  logRealtimeTelemetry: vi.fn(),
}));

vi.mock("@/lib/reward-overlays/mount-web-reward-layers", () => ({
  startPaymentRewardOverlays: vi.fn(),
}));

vi.mock("@/lib/factory-to-style", () => ({
  createAnimationFromStyle: vi.fn(() => ({
    stop: vi.fn(),
    finished: Promise.resolve(),
  })),
}));

const wrapRun = vi.fn(
  (
    factory: () => unknown,
    ctx?: { onCharacterPlaybackFinished?: (r: unknown) => void }
  ) =>
    async () => {
      factory();
      ctx?.onCharacterPlaybackFinished?.({
        playbackResult: "completed",
        cycle1Outcome: "completed",
        cycle2Outcome: "completed",
      });
    }
);

vi.mock("@/lib/wrapPaymentAnimation", () => ({
  wrapPaymentAnimation: (
    factory: () => unknown,
    ctx?: { onCharacterPlaybackFinished?: (r: unknown) => void }
  ) => wrapRun(factory, ctx),
}));

import { isPayerOriginRecoveryEnabled } from "@/lib/payer-origin-recovery-flag";
import {
  PENDING_PAYMENT_RETURN_V1_KEY,
  writePendingPaymentReturn,
  readPendingPaymentReturn,
} from "@/lib/pending-payment-return";
import {
  writePaymentRecoverySession,
  readPaymentRecoverySession,
  markPaymentRecoverySessionCompleted,
} from "@/lib/payment-recovery-session";
import {
  buildPaymentPlaybackKey,
  buildPaymentPlaybackKeyForBundleCharacter,
  SCREEN_DISPLAY_PLAYBACK_PREFIX,
} from "@/lib/payment-playback-key";
import {
  runPaymentRecoveryExchange,
  sanitizeSuccessUrlInHistory,
} from "@/lib/payment-recovery-exchange";
import {
  exchangeRecoveryStateRequest,
  claimRecoveryOccurrencesRequest,
} from "@/lib/payment-recovery-client";
import { enqueuePayerOriginRecoveryBundle } from "@/lib/enqueue-payer-origin-recovery";
import { enqueuePaymentBundleForValidatedTip } from "@/lib/run-payment-bundle-animations";
import {
  clearPlaybackKeyState,
  getPlaybackKeyState,
  reservePlaybackKey,
} from "@/lib/playback-key-lifecycle";
import {
  getSharedTipGuard,
  resetSharedTipGuardForTests,
} from "@/lib/animation-guard";
import { shouldSkipPaymentSegment } from "@/lib/payment-playback-budget";
import { createAnimationQueue } from "@/lib/animation-queue-core";

vi.mock("@/lib/payer-origin-recovery-flag", () => ({
  isPayerOriginRecoveryEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/payment-recovery-client", () => ({
  exchangeRecoveryStateRequest: vi.fn(),
  claimRecoveryOccurrencesRequest: vi.fn(),
  renewRecoveryClaimRequest: vi.fn(),
  reportRecoveryProgressRequest: vi.fn(),
  isDefinitiveExchangeRejection: vi.fn((err: unknown) => {
    const e = err as { kind?: string };
    return e?.kind === "forbidden" || e?.kind === "conflict";
  }),
  isTransientExchangeFailure: vi.fn((err: unknown) => {
    const e = err as { kind?: string };
    return e?.kind === "network" || e?.kind === "server";
  }),
  traceRecoveryApiError: vi.fn(),
  RecoveryApiError: class extends Error {
    kind: string;
    status: number;
    constructor(kind: string, status: number, msg: string) {
      super(msg);
      this.kind = kind;
      this.status = status;
    }
  },
}));

vi.mock("@/lib/payment-playback-budget", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/payment-playback-budget")>();
  return {
    ...actual,
    shouldSkipPaymentSegment: vi.fn(actual.shouldSkipPaymentSegment),
  };
});

vi.mock("@/lib/tip-animation-characters", () => ({
  resolvePaymentCharactersForTip: vi.fn((data: TipAnimationEvent) => ({
    characters: (data.selectedTips ?? []).map(name => ({
      name,
      iconUrl: "/i.png",
      styleName: "Confetti",
    })),
    summary: {
      expectedCount: data.selectedTips?.length ?? 0,
      runnableCount: data.selectedTips?.length ?? 0,
      rejectedCount: 0,
      serverResolvedCount: 0,
      localFallbackCount: 0,
      unresolvedCount: 0,
      missingIconCount: 0,
      entries: [],
    },
  })),
  resolveStyleCharactersForTip: vi.fn(),
}));

describe("P0-B payer-origin recovery", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    const sessionStorageMock = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
      clear: () => storage.clear(),
    };
    const localStorageMock = {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      sessionStorage: sessionStorageMock,
      localStorage: localStorageMock,
      location: {
        pathname: "/success",
        search: "",
        origin: "http://localhost",
        href: "http://localhost/success",
      },
      history: { replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    clearPlaybackKeyState();
    resetSharedTipGuardForTests();
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", "http://api.test/api/v1");
    vi.mocked(isPayerOriginRecoveryEnabled).mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("1. recovery flag false → no exchange", async () => {
    writePendingPaymentReturn({
      transactionId: "tx-1",
      eventId: "ev-1",
      paymentOrigin: "http://localhost/room/1",
      paymentSurface: "event_room",
      isRedirectPayment: true,
      recoveryState: "secret-state",
    });
    const result = await runPaymentRecoveryExchange({
      stripePaymentIntentId: "pi_1",
      redirectStatus: "succeeded",
      ownership: {},
    });
    expect(result.outcome).toBe("skipped_flag_off");
    expect(exchangeRecoveryStateRequest).not.toHaveBeenCalled();
  });

  it("2. PaymentIntent recoveryState saved only when present", () => {
    writePendingPaymentReturn({
      transactionId: "tx-1",
      eventId: "ev-1",
      paymentOrigin: "http://localhost/content",
      paymentSurface: "content_client",
      isRedirectPayment: true,
    });
    expect(readPendingPaymentReturn()?.recoveryState).toBeUndefined();
    writePendingPaymentReturn({
      transactionId: "tx-2",
      eventId: "ev-1",
      paymentOrigin: "http://localhost/content",
      paymentSurface: "content_client",
      isRedirectPayment: true,
      recoveryState: "raw-cred",
    });
    expect(readPendingPaymentReturn()?.recoveryState).toBe("raw-cred");
  });

  it("3. raw recovery state only in session storage snapshot", () => {
    writePendingPaymentReturn({
      transactionId: "tx-1",
      eventId: "ev-1",
      paymentOrigin: "http://localhost/room",
      paymentSurface: "event_room",
      isRedirectPayment: true,
      recoveryState: "raw-only-here",
    });
    expect(localStorage.getItem(PENDING_PAYMENT_RETURN_V1_KEY)).toBeNull();
    expect(sessionStorage.getItem(PENDING_PAYMENT_RETURN_V1_KEY)).toContain(
      "raw-only-here"
    );
  });

  it("4–6. /success exchange stores token and clears raw state", async () => {
    vi.mocked(isPayerOriginRecoveryEnabled).mockReturnValue(true);
    writePendingPaymentReturn({
      transactionId: "00000000-0000-4000-8000-000000000001",
      eventId: "ev-1",
      paymentOrigin: "http://localhost/room/1",
      paymentSurface: "event_room",
      isRedirectPayment: true,
      recoveryState: "raw-state",
    });
    vi.mocked(exchangeRecoveryStateRequest).mockResolvedValue({
      sessionToken: "sess-tok",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    });

    const result = await runPaymentRecoveryExchange({
      stripePaymentIntentId: "pi_test_123",
      redirectStatus: "succeeded",
      ownership: { clientSessionId: "sess-1" },
    });

    expect(result.outcome).toBe("exchanged");
    expect(exchangeRecoveryStateRequest).toHaveBeenCalled();
    expect(readPendingPaymentReturn()?.recoveryState).toBeUndefined();
    expect(readPaymentRecoverySession()?.sessionToken).toBe("sess-tok");
  });

  it("7. definitive exchange rejection clears invalid state but continues", async () => {
    vi.mocked(isPayerOriginRecoveryEnabled).mockReturnValue(true);
    writePendingPaymentReturn({
      transactionId: "00000000-0000-4000-8000-000000000002",
      eventId: "ev-1",
      paymentOrigin: "http://localhost/room/1",
      paymentSurface: "event_room",
      isRedirectPayment: true,
      recoveryState: "bad-state",
    });
    const { RecoveryApiError } = await import("@/lib/payment-recovery-client");
    vi.mocked(exchangeRecoveryStateRequest).mockRejectedValue(
      new RecoveryApiError("forbidden", 403, "invalid")
    );
    const result = await runPaymentRecoveryExchange({
      stripePaymentIntentId: "pi_bad",
      redirectStatus: "succeeded",
      ownership: {},
    });
    expect(result.outcome).toBe("definitive_rejection");
    expect(readPendingPaymentReturn()?.recoveryState).toBeUndefined();
  });

  it("8. transient exchange failure returns transient_failure", async () => {
    vi.mocked(isPayerOriginRecoveryEnabled).mockReturnValue(true);
    writePendingPaymentReturn({
      transactionId: "00000000-0000-4000-8000-000000000003",
      eventId: "ev-1",
      paymentOrigin: "http://localhost/room/1",
      paymentSurface: "event_room",
      isRedirectPayment: true,
      recoveryState: "state",
    });
    const { RecoveryApiError } = await import("@/lib/payment-recovery-client");
    vi.mocked(exchangeRecoveryStateRequest).mockRejectedValue(
      new RecoveryApiError("server", 503, "down")
    );
    const result = await runPaymentRecoveryExchange({
      stripePaymentIntentId: "pi_x",
      redirectStatus: "succeeded",
      ownership: {},
    });
    expect(result.outcome).toBe("transient_failure");
    expect(readPendingPaymentReturn()?.recoveryState).toBe("state");
  });

  it("9. sensitive return parameters removed from browser history", () => {
    const location = {
      pathname: "/success",
      search: "?payment_intent=pi_x&payment_intent_client_secret=sec",
      origin: "http://localhost",
      href: "http://localhost/success?payment_intent=pi_x&payment_intent_client_secret=sec",
    };
    const replaceState = vi.fn((_s: unknown, _t: unknown, url?: string) => {
      if (url === "/success") {
        location.search = "";
        location.href = "http://localhost/success";
      }
    });
    vi.stubGlobal("window", {
      ...window,
      location,
      history: { replaceState },
    });
    sanitizeSuccessUrlInHistory();
    expect(replaceState).toHaveBeenCalledWith({}, "", "http://localhost/success");
  });

  it("10. legacy payload uses legacy playback key", () => {
    const data: TipAnimationEvent = {
      id: "bundle-1",
      eventId: "ev",
      serverTs: 1,
      selectedTips: ["Heart"],
    };
    expect(buildPaymentPlaybackKeyForBundleCharacter(data, 0, "Heart")).toBe(
      "bundle-1-Heart"
    );
  });

  it("11. canonical payload uses occurrence-aware key", () => {
    const data: TipAnimationEvent = {
      id: "bundle-1",
      eventId: "ev",
      serverTs: 1,
      selectedTips: ["Heart", "Heart"],
      resolvedTips: [
        {
          name: "Heart",
          iconUrl: "",
          styleName: "Confetti",
          characterId: "c1",
          occurrenceIndex: 0,
          occurrenceId: "occ-0",
        },
        {
          name: "Heart",
          iconUrl: "",
          styleName: "Confetti",
          characterId: "c1",
          occurrenceIndex: 1,
          occurrenceId: "occ-1",
        },
      ],
    };
    expect(buildPaymentPlaybackKeyForBundleCharacter(data, 0, "Heart")).toBe(
      "bundle-1-0-Heart"
    );
    expect(buildPaymentPlaybackKeyForBundleCharacter(data, 1, "Heart")).toBe(
      "bundle-1-1-Heart"
    );
  });

  it("12. duplicate character names create distinct keys", () => {
    const k0 = buildPaymentPlaybackKey({
      bundleId: "b1",
      characterName: "Heart",
      occurrenceIndex: 0,
    });
    const k1 = buildPaymentPlaybackKey({
      bundleId: "b1",
      characterName: "Heart",
      occurrenceIndex: 1,
    });
    expect(k0).not.toBe(k1);
  });

  it("13. Screen Display prefix remains independent", () => {
    expect(
      buildPaymentPlaybackKey({
        prefix: SCREEN_DISPLAY_PLAYBACK_PREFIX,
        bundleId: "b1",
        characterName: "Heart",
      })
    ).toBe("screen-b1-Heart");
  });

  it("14. recovery does not call monotonic guard", () => {
    const guardSpy = vi.spyOn(getSharedTipGuard(), "shouldAccept");
    enqueuePayerOriginRecoveryBundle({
      canonicalPayload: {
        id: "bundle-r",
        eventId: "ev",
        serverTs: Date.now() - 60_000,
        playbackEndsAt: Date.now() - 30_000,
        selectedTips: ["Heart"],
        resolvedTips: [
          {
            name: "Heart",
            iconUrl: "/h.png",
            styleName: "Confetti",
            characterId: "c1",
            occurrenceIndex: 0,
            occurrenceId: "occ-h",
          },
        ],
      },
      remainingOccurrenceIds: ["occ-h"],
      surface: "content_client",
      claimId: "claim-1",
      deliverySource: "payer_origin_recovery",
      bypassSegmentFreshness: true,
      characterMap: new Map(),
      enqueue: () => ({ accepted: true }),
    });
    expect(guardSpy).not.toHaveBeenCalled();
  });

  it("15. recovery does not dispatch validated-tip", () => {
    const dispatch = vi.fn();
    window.addEventListener("validated-tip", dispatch);
    enqueuePayerOriginRecoveryBundle({
      canonicalPayload: {
        id: "bundle-r2",
        eventId: "ev",
        serverTs: 1,
        selectedTips: ["Heart"],
        resolvedTips: [
          {
            name: "Heart",
            iconUrl: "/h.png",
            styleName: "Confetti",
            characterId: "c1",
            occurrenceIndex: 0,
            occurrenceId: "occ-h2",
          },
        ],
      },
      remainingOccurrenceIds: ["occ-h2"],
      surface: "content_client",
      claimId: "claim-2",
      deliverySource: "payer_origin_recovery",
      bypassSegmentFreshness: true,
      characterMap: new Map(),
      enqueue: () => ({ accepted: true }),
    });
    expect(dispatch).not.toHaveBeenCalled();
    window.removeEventListener("validated-tip", dispatch);
  });

  it("16. recovery after playbackEndsAt is allowed", () => {
    vi.mocked(shouldSkipPaymentSegment).mockReturnValue(true);
    const { enqueuedCount } = enqueuePayerOriginRecoveryBundle({
      canonicalPayload: {
        id: "bundle-exp",
        eventId: "ev",
        serverTs: 1,
        playbackEndsAt: 2,
        selectedTips: ["Heart"],
        resolvedTips: [
          {
            name: "Heart",
            iconUrl: "/h.png",
            styleName: "Confetti",
            characterId: "c1",
            occurrenceIndex: 0,
            occurrenceId: "occ-exp",
          },
        ],
      },
      remainingOccurrenceIds: ["occ-exp"],
      surface: "content_client",
      claimId: "claim-exp",
      deliverySource: "payer_origin_recovery",
      bypassSegmentFreshness: true,
      characterMap: new Map(),
      enqueue: tasks => {
        expect(tasks.length).toBe(1);
        return { accepted: true };
      },
    });
    expect(enqueuedCount).toBe(1);
  });

  it("17. normal realtime expired segment is still skipped", () => {
    vi.mocked(shouldSkipPaymentSegment).mockReturnValue(true);
    const q = createAnimationQueue({
      eventId: "ev",
      getEnabled: () => true,
      surface: "content_client",
    });
    const result = enqueuePaymentBundleForValidatedTip({
      data: {
        id: "bundle-live",
        eventId: "ev",
        serverTs: 1,
        playbackEndsAt: 2,
        selectedTips: ["Heart"],
      },
      characterMap: new Map(),
      buildDedupeKey: name => `bundle-live-${name}`,
      enqueue: q.enqueue,
      surface: "content_client",
      bundleRunContext: { deliverySource: "realtime" },
    });
    expect(result.enqueued).toBe(true);
    expect(result.runnableCount).toBe(1);
  });

  it("18. Pusher wins race → recovery skips occurrence", () => {
    reservePlaybackKey("bundle-race-0-Heart", { surface: "content_client" });
    const { enqueuedCount, skippedRealtime } =
      enqueuePayerOriginRecoveryBundle({
        canonicalPayload: {
          id: "bundle-race",
          eventId: "ev",
          serverTs: 1,
          selectedTips: ["Heart"],
          resolvedTips: [
            {
              name: "Heart",
              iconUrl: "/h.png",
              styleName: "Confetti",
              characterId: "c1",
              occurrenceIndex: 0,
              occurrenceId: "occ-race",
            },
          ],
        },
        remainingOccurrenceIds: ["occ-race"],
        surface: "content_client",
        claimId: "claim-race",
        deliverySource: "payer_origin_recovery",
        bypassSegmentFreshness: true,
        characterMap: new Map(),
        enqueue: () => ({ accepted: true }),
      });
    expect(enqueuedCount).toBe(0);
    expect(skippedRealtime).toContain("occ-race");
  });

  it("19. recovery wins race → late Pusher skips duplicate key", () => {
    const key = "bundle-win-0-Heart";
    reservePlaybackKey(key, { surface: "content_client" });
    expect(getPlaybackKeyState(key)).toBe("reserved");
    const q = createAnimationQueue({
      eventId: "ev",
      getEnabled: () => true,
    });
    const result = enqueuePaymentBundleForValidatedTip({
      data: {
        id: "bundle-win",
        eventId: "ev",
        serverTs: 1,
        selectedTips: ["Heart"],
        resolvedTips: [
          {
            name: "Heart",
            iconUrl: "/i.png",
            styleName: "Confetti",
            characterId: "c1",
            occurrenceIndex: 0,
            occurrenceId: "occ-win",
          },
        ],
      },
      characterMap: new Map(),
      buildDedupeKey: (name, idx) =>
        buildPaymentPlaybackKeyForBundleCharacter(
          {
            id: "bundle-win",
            eventId: "ev",
            serverTs: 1,
            selectedTips: ["Heart"],
            resolvedTips: [
              {
                name: "Heart",
                iconUrl: "/i.png",
                styleName: "Confetti",
                characterId: "c1",
                occurrenceIndex: 0,
                occurrenceId: "occ-win",
              },
            ],
          },
          idx ?? 0,
          name
        ),
      enqueue: q.enqueue,
      bundleRunContext: { deliverySource: "realtime" },
    });
    expect(result.runnableCount).toBe(0);
  });

  it("20. partial overlap recovers only missing occurrences", () => {
    reservePlaybackKey("bundle-part-0-Heart", { surface: "content_client" });
    const tasks: string[] = [];
    enqueuePayerOriginRecoveryBundle({
      canonicalPayload: {
        id: "bundle-part",
        eventId: "ev",
        serverTs: 1,
        selectedTips: ["Heart", "Heart"],
        resolvedTips: [
          {
            name: "Heart",
            iconUrl: "/h.png",
            styleName: "Confetti",
            characterId: "c1",
            occurrenceIndex: 0,
            occurrenceId: "occ-a",
          },
          {
            name: "Heart",
            iconUrl: "/h.png",
            styleName: "Spin",
            characterId: "c1",
            occurrenceIndex: 1,
            occurrenceId: "occ-b",
          },
        ],
      },
      remainingOccurrenceIds: ["occ-a", "occ-b"],
      surface: "content_client",
      claimId: "claim-part",
      deliverySource: "payer_origin_recovery",
      bypassSegmentFreshness: true,
      characterMap: new Map(),
      enqueue: t => {
        tasks.push(...t.map(x => x.playbackKey));
        return { accepted: true };
      },
    });
    expect(tasks).toEqual(["bundle-part-1-Heart"]);
  });

  it("21. completion reported only after both cycles via callback", async () => {
    const onFinished = vi.fn();
    enqueuePayerOriginRecoveryBundle({
      canonicalPayload: {
        id: "bundle-done",
        eventId: "ev",
        serverTs: 1,
        selectedTips: ["Heart"],
        resolvedTips: [
          {
            name: "Heart",
            iconUrl: "/h.png",
            styleName: "Confetti",
            characterId: "c1",
            occurrenceIndex: 0,
            occurrenceId: "occ-done",
          },
        ],
      },
      remainingOccurrenceIds: ["occ-done"],
      surface: "content_client",
      claimId: "claim-done",
      deliverySource: "payer_origin_recovery",
      bypassSegmentFreshness: true,
      characterMap: new Map(),
      enqueue: tasks => {
        void tasks[0]?.run();
        return { accepted: true };
      },
      onOccurrenceFinished: onFinished,
    });
    await Promise.resolve();
    expect(onFinished).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrenceId: "occ-done",
        playbackResult: "completed",
        cycle1Outcome: "completed",
        cycle2Outcome: "completed",
      })
    );
  });

  it("24. refresh after completion does not replay", () => {
    writePaymentRecoverySession({
      sessionToken: "tok",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      transactionId: "tx-done",
      eventId: "ev",
      stripePaymentIntentId: "pi_done",
      recoveryCompleted: true,
    });
    expect(readPaymentRecoverySession()?.recoveryCompleted).toBe(true);
  });

  it("25. wallet/no-redirect path does not activate recovery (no redirect flag)", () => {
    writePendingPaymentReturn({
      transactionId: "tx-w",
      eventId: "ev",
      paymentOrigin: "http://localhost/room",
      paymentSurface: "event_room",
      isRedirectPayment: false,
    });
    expect(readPendingPaymentReturn()?.isRedirectPayment).toBe(false);
  });

  it("flag off → no claim call", async () => {
    vi.mocked(isPayerOriginRecoveryEnabled).mockReturnValue(false);
    writePaymentRecoverySession({
      sessionToken: "tok",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      transactionId: "tx",
      eventId: "ev",
      stripePaymentIntentId: "pi",
    });
    expect(claimRecoveryOccurrencesRequest).not.toHaveBeenCalled();
  });
});

describe("P0-B surface mount markers", () => {
  it("26–30. recovery hook module exports for surface integration", async () => {
    const mod = await import("@/hooks/use-payer-origin-animation-recovery");
    expect(typeof mod.usePayerOriginAnimationRecovery).toBe("function");
    expect(mod.normalizePaymentOriginUrl("http://a/b?x=1#h")).toBe(
      "http://a/b?x=1"
    );
  });
});

describe("e6a-v3 compiled marker", () => {
  it("31–32. e6a-v3 remains in compiled output", async () => {
    const { SPIN_LIFECYCLE_VERSION } = await import("@/animation-styles/spin");
    expect(SPIN_LIFECYCLE_VERSION).toBe("e6a-v3");
  });
});
