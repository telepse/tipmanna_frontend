/**
 * @vitest-environment happy-dom
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const subscribeGlobalTvPresence = vi.fn(() => () => undefined);
const globalTvPresenceTrackActivity = vi.fn(async () => undefined);

vi.mock("@/lib/global-tv-presence-hub", () => ({
  subscribeGlobalTvPresence: (...args: unknown[]) =>
    subscribeGlobalTvPresence(...args),
  globalTvPresenceTrackActivity: (...args: unknown[]) =>
    globalTvPresenceTrackActivity(...args),
}));

vi.mock("@/lib/anonymous-viewer", () => ({
  getOrCreateAnonymousViewer: () => ({
    id: "anon-1",
    username: "anon",
    role: "VISITOR",
  }),
}));

import { usePusherTrackingGlobalTV } from "@/hooks/use-global-viewer-count";

function PresenceProbe() {
  usePusherTrackingGlobalTV({
    tvId: "global-tv",
    userInfo: { id: "u1", username: "u", role: "TIPPER" },
  });
  return null;
}

describe("usePusherTrackingGlobalTV Explore E2E gate", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    subscribeGlobalTvPresence.mockClear();
    globalTvPresenceTrackActivity.mockClear();
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
    window.history.replaceState({}, "", "/explore");
  });

  it("E2E: does not subscribe presence or track viewing_tv activity", async () => {
    window.history.replaceState({}, "", "/explore?e2e=1");
    await act(async () => {
      root.render(createElement(PresenceProbe));
    });
    expect(subscribeGlobalTvPresence).not.toHaveBeenCalled();
    expect(globalTvPresenceTrackActivity).not.toHaveBeenCalled();
  });

  it("non-E2E: subscribes and tracks viewing_tv", async () => {
    window.history.replaceState({}, "", "/explore?tab=feed");
    await act(async () => {
      root.render(createElement(PresenceProbe));
    });
    expect(subscribeGlobalTvPresence).toHaveBeenCalled();
    expect(globalTvPresenceTrackActivity).toHaveBeenCalledWith(
      "global-tv",
      "viewing_tv"
    );
  });
});
