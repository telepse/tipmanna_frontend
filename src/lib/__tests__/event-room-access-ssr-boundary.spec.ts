import { describe, expect, it, vi } from "vitest";

import { shouldHardReloadRoomAfterAccessGrant } from "../event-room-access-gate.util";
import {
  applyEventRoomAccessCredentialHeaders,
  reloadRoomPageAfterAccessGrant,
  resolveEventRoomAccessCredentialsForFetch,
} from "../event-room-access-code-cookie";

describe("SSR/client boundary after host_code grant", () => {
  it("requires hard reload when SSR shell has no room children", () => {
    expect(shouldHardReloadRoomAfterAccessGrant(true, false)).toBe(true);
    expect(shouldHardReloadRoomAfterAccessGrant(true, true)).toBe(false);
  });

  it("forwards cookie credentials on gated event GET (getEventByIdAction path)", () => {
    const fromCookies = resolveEventRoomAccessCredentialsForFetch(undefined, {
      accessCode: "HOST-CODE-1",
      email: "guest@example.com",
    });
    const headers: Record<string, string> = {};
    applyEventRoomAccessCredentialHeaders(headers, fromCookies);
    expect(headers["x-event-room-access-code"]).toBe("HOST-CODE-1");
    expect(headers["x-event-room-access-email"]).toBe("guest@example.com");
  });

  it("uses full navigation (not soft refresh) to load SSR room payload", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/room/ev-1", search: "?x=1", assign },
    });
    reloadRoomPageAfterAccessGrant();
    expect(assign).toHaveBeenCalledWith("/room/ev-1?x=1");
    vi.unstubAllGlobals();
  });
});
