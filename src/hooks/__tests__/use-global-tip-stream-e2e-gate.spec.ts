/**
 * @vitest-environment happy-dom
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const subscribeChannel = vi.fn();
const unsubscribeChannel = vi.fn();
const registerTipStreamConsumer = vi.fn(() => () => undefined);
const registerLegacyTipStreamProducer = vi.fn(() => () => undefined);

vi.mock("@/lib/pusher", () => ({
  subscribeChannel: (...args: unknown[]) => subscribeChannel(...args),
  unsubscribeChannel: (...args: unknown[]) => unsubscribeChannel(...args),
}));

vi.mock("@/lib/shared-tip-stream-broker", () => ({
  registerTipStreamConsumer: (...args: unknown[]) =>
    registerTipStreamConsumer(...args),
}));

vi.mock("@/lib/legacy-tip-stream-producer", () => ({
  registerLegacyTipStreamProducer: (...args: unknown[]) =>
    registerLegacyTipStreamProducer(...args),
}));

vi.mock("@/lib/single-tip-stream-broker-flag", () => ({
  isSingleTipStreamBrokerEnabled: () => false,
}));

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/animationDebug", () => ({
  animLog: vi.fn(),
  animWarn: vi.fn(),
}));

vi.mock("@/lib/realtime-telemetry", () => ({
  logRealtimeTelemetry: vi.fn(),
}));

vi.mock("@/lib/animation-guard", () => ({
  createTipGuard: () => ({ shouldAccept: () => true }),
}));

import {
  acquireGlobalLiveTvChannel,
  releaseGlobalLiveTvChannel,
  useGlobalTipStream,
} from "@/hooks/use-global-tip-stream";
import { GlobalTipStreamProvider } from "@/providers/global-tip-stream-provider";

function TipStreamProbe({ enabled = true }: { enabled?: boolean }) {
  useGlobalTipStream({ enabled, surface: "explore_feed" });
  return null;
}

describe("useGlobalTipStream Explore E2E gate", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalSearch = window.location.search;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    subscribeChannel.mockReset();
    unsubscribeChannel.mockReset();
    registerTipStreamConsumer.mockClear();
    registerLegacyTipStreamProducer.mockClear();
    subscribeChannel.mockImplementation(() => ({
      bind: vi.fn(),
      unbind: vi.fn(),
    }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllEnvs();
    window.history.replaceState({}, "", `/${originalSearch || ""}`);
  });

  function setSearch(search: string) {
    const path = search
      ? `/explore${search.startsWith("?") ? search : `?${search}`}`
      : "/explore";
    window.history.replaceState({}, "", path);
  }

  it("E2E fixture mode: acquireGlobalLiveTvChannel does not subscribe", () => {
    setSearch("?e2e=1&tab=join");
    expect(acquireGlobalLiveTvChannel()).toBeNull();
    expect(subscribeChannel).not.toHaveBeenCalled();
  });

  it("E2E fixture mode: useGlobalTipStream does not subscribe or bind", () => {
    setSearch("?e2e=1");
    act(() => {
      root.render(createElement(TipStreamProbe));
    });
    expect(subscribeChannel).not.toHaveBeenCalled();
    expect(registerTipStreamConsumer).not.toHaveBeenCalled();
    expect(registerLegacyTipStreamProducer).not.toHaveBeenCalled();
  });

  it("E2E fixture mode: GlobalTipStreamProvider does not register producer", () => {
    setSearch("?e2e=1");
    act(() => {
      root.render(
        createElement(
          GlobalTipStreamProvider,
          { eventId: "evt-1", surface: "explore_feed" },
          createElement(TipStreamProbe)
        )
      );
    });
    expect(subscribeChannel).not.toHaveBeenCalled();
    expect(registerTipStreamConsumer).not.toHaveBeenCalled();
    expect(registerLegacyTipStreamProducer).not.toHaveBeenCalled();
  });

  it("cleanup remains safe when E2E skipped mount (no leaked unsubscribe)", () => {
    setSearch("?e2e=1");
    act(() => {
      root.render(createElement(TipStreamProbe));
    });
    act(() => {
      root.render(createElement(TipStreamProbe, { enabled: false }));
    });
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    expect(unsubscribeChannel).not.toHaveBeenCalled();
    expect(subscribeChannel).not.toHaveBeenCalled();
  });

  it("non-E2E mode: acquire + hook still create tip stream subscription", () => {
    setSearch("?tab=feed");
    const channel = acquireGlobalLiveTvChannel();
    expect(channel).not.toBeNull();
    expect(subscribeChannel).toHaveBeenCalledWith("global-live-tv");
    releaseGlobalLiveTvChannel();
    expect(unsubscribeChannel).toHaveBeenCalledWith("global-live-tv");

    subscribeChannel.mockClear();
    unsubscribeChannel.mockClear();

    act(() => {
      root.render(createElement(TipStreamProbe));
    });
    expect(subscribeChannel).toHaveBeenCalledWith("global-live-tv");
    const hooked = subscribeChannel.mock.results[0]?.value as {
      bind: ReturnType<typeof vi.fn>;
    };
    expect(hooked.bind).toHaveBeenCalledWith(
      "tip-animation",
      expect.any(Function)
    );

    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    expect(unsubscribeChannel).toHaveBeenCalledWith("global-live-tv");
  });

  it("build flag off + ?e2e=1 still uses tip stream (query alone is not enough)", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "");
    delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    setSearch("?e2e=1");
    expect(acquireGlobalLiveTvChannel()).not.toBeNull();
    expect(subscribeChannel).toHaveBeenCalledWith("global-live-tv");
  });
});
