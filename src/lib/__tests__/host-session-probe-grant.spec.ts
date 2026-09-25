import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearHostSessionGrant,
  isHostSessionGrantValid,
  writeHostSessionGrant,
} from "@/lib/host-session-grant";

vi.mock("@/lib/host-session-client", () => ({
  getHostUserFromCookies: vi.fn(() => null),
}));

import {
  notifyHostSessionCleared,
  notifyHostSessionTouched,
  probeHostSessionVerified,
} from "@/lib/host-session-probe";

describe("host session probe grant policy", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent<T> {
        type: string;
        detail?: T;
        constructor(type: string, init?: { detail?: T }) {
          this.type = type;
          this.detail = init?.detail;
        }
      }
    );
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        json: async () => ({
          active: true,
          hostId: "host-verify",
          hostSessionExpiresAt: "2099-01-01T00:00:00.000Z",
        }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearHostSessionGrant();
  });

  it("notifyHostSessionTouched does not write grant", () => {
    notifyHostSessionTouched({
      active: true,
      hostId: "host-touch",
    });
    expect(isHostSessionGrantValid("host-touch")).toBe(false);
  });

  it("successful verify writes grant", async () => {
    await probeHostSessionVerified();
    expect(isHostSessionGrantValid("host-verify")).toBe(true);
  });

  it("503 verify does not write grant", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 503,
      json: async () => ({ code: "HOST_SESSION_PROBE_FAILED" }),
    } as Response);

    await probeHostSessionVerified();
    expect(isHostSessionGrantValid("host-verify")).toBe(false);
  });

  it("notifyHostSessionCleared clears grant", () => {
    writeHostSessionGrant("host-1");
    notifyHostSessionCleared();
    expect(isHostSessionGrantValid("host-1")).toBe(false);
  });
});
