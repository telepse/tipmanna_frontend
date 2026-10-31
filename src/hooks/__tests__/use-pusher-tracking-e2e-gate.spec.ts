/**
 * @vitest-environment happy-dom
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { PusherCtor } = vi.hoisted(() => {
  const PusherCtor = vi.fn(function MockPusher(this: {
    subscribe: ReturnType<typeof vi.fn>;
    connection: { bind: ReturnType<typeof vi.fn> };
    disconnect: ReturnType<typeof vi.fn>;
  }) {
    this.subscribe = vi.fn(() => ({
      bind: vi.fn(),
      unbind_all: vi.fn(),
      unsubscribe: vi.fn(),
    }));
    this.connection = { bind: vi.fn() };
    this.disconnect = vi.fn();
  });
  return { PusherCtor };
});

vi.mock("pusher-js", () => ({
  default: PusherCtor,
}));

vi.mock("@/lib/getAuthToken", () => ({
  getAuthToken: () => "tok",
}));

import { usePusherTracking } from "@/hooks/use-pusher-tracking";

function Probe({ eventId }: { eventId: string }) {
  const { trackActivity } = usePusherTracking({
    eventId,
    userInfo: {
      id: "u1",
      type: "tipper",
      username: "t",
      isAuthenticated: true,
    },
  });
  return createElement("button", {
    type: "button",
    "data-testid": "track",
    onClick: () => void trackActivity("viewing_event"),
  });
}

describe("usePusherTracking Explore E2E gate", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalSearch = window.location.search;
  const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    PusherCtor.mockClear();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    // Prefer beacon so cleanup leave does not leave an in-flight fetch for happy-dom.
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => true),
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "key");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "eu");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", "https://api.example");
  });

  afterEach(() => {
    // Skip leave network during unmount (dual-gate short-circuit).
    window.history.replaceState({}, "", "/explore?e2e=1");
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", `/${originalSearch || ""}`);
  });

  function setSearch(search: string) {
    const path = search
      ? `/explore${search.startsWith("?") ? search : `?${search}`}`
      : "/explore";
    window.history.replaceState({}, "", path);
  }

  it("E2E fixture mode: does not construct Pusher or send activity", async () => {
    setSearch("?e2e=1");
    await act(async () => {
      root.render(createElement(Probe, { eventId: "evt-1" }));
    });
    expect(PusherCtor).not.toHaveBeenCalled();
    const btn = container.querySelector(
      "[data-testid=track]"
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("non-E2E: constructs Pusher and can send activity", async () => {
    setSearch("?tab=feed");
    await act(async () => {
      root.render(createElement(Probe, { eventId: "evt-2" }));
    });
    expect(PusherCtor).toHaveBeenCalled();
    const btn = container.querySelector(
      "[data-testid=track]"
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(fetchMock).toHaveBeenCalled();
    const activityCall = fetchMock.mock.calls.find(c =>
      String((c as unknown[])[0] ?? "").includes("/activity")
    );
    expect(activityCall).toBeTruthy();
  });
});
