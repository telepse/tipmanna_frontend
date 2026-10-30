/**
 * @vitest-environment happy-dom
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const subscribeChannel = vi.fn();
const unsubscribeChannel = vi.fn();
const subscribeHostInAppNotifications = vi.fn(() => () => undefined);
const getNotificationsUnreadCountAction = vi.fn(async () => ({
  success: true,
  data: { count: 2 },
}));
const getHostNotificationsUnreadCountAction = vi.fn(async () => ({
  success: true,
  data: { count: 1 },
}));

vi.mock("@/lib/pusher", () => ({
  subscribeChannel: (...args: unknown[]) => subscribeChannel(...args),
  unsubscribeChannel: (...args: unknown[]) => unsubscribeChannel(...args),
}));

vi.mock("@/lib/host-notification-channel", () => ({
  subscribeHostInAppNotifications: (...args: unknown[]) =>
    subscribeHostInAppNotifications(...args),
}));

vi.mock("@/actions/notifications", () => ({
  getNotificationsUnreadCountAction: (...args: unknown[]) =>
    getNotificationsUnreadCountAction(...args),
  getHostNotificationsUnreadCountAction: (...args: unknown[]) =>
    getHostNotificationsUnreadCountAction(...args),
}));

vi.mock("@/lib/getAuthToken", () => ({
  getAuthToken: () => "tok",
  getDeviceKey: () => null,
}));

vi.mock("@/lib/host-session-client", () => ({
  getHostUserFromCookies: () => null,
  hasActiveHostSession: () => false,
}));

vi.mock("react-redux", () => ({
  useSelector: (sel: (s: unknown) => unknown) =>
    sel({
      auth: {
        user: { id: "user-1", role: "tipper" },
      },
    }),
}));

import { useNotificationBadge } from "@/hooks/use-notification-badge";

function BadgeProbe() {
  useNotificationBadge();
  return null;
}

describe("useNotificationBadge Explore E2E gate", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalSearch = window.location.search;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    subscribeChannel.mockReset();
    unsubscribeChannel.mockReset();
    subscribeHostInAppNotifications.mockClear();
    getNotificationsUnreadCountAction.mockClear();
    getHostNotificationsUnreadCountAction.mockClear();
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

  it("E2E fixture mode: does not subscribe Pusher or call unread Server Actions", async () => {
    setSearch("?e2e=1");
    await act(async () => {
      root.render(createElement(BadgeProbe));
    });
    expect(subscribeChannel).not.toHaveBeenCalled();
    expect(subscribeHostInAppNotifications).not.toHaveBeenCalled();
    expect(getNotificationsUnreadCountAction).not.toHaveBeenCalled();
    expect(getHostNotificationsUnreadCountAction).not.toHaveBeenCalled();
  });

  it("non-E2E: subscribes tipper notifications channel and refreshes count", async () => {
    setSearch("?tab=feed");
    await act(async () => {
      root.render(createElement(BadgeProbe));
    });
    expect(subscribeChannel).toHaveBeenCalledWith(
      "tipper-notifications-user-1"
    );
    expect(getNotificationsUnreadCountAction).toHaveBeenCalled();
  });

  it("cleanup unsubscribes when leaving non-E2E mount", async () => {
    setSearch("?tab=feed");
    await act(async () => {
      root.render(createElement(BadgeProbe));
    });
    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    expect(unsubscribeChannel).toHaveBeenCalledWith(
      "tipper-notifications-user-1"
    );
  });
});
