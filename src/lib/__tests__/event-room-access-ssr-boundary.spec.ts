import { describe, expect, it, vi } from "vitest";

import { shouldHardReloadRoomAfterAccessGrant } from "../event-room-access-gate.util";
import { reloadRoomPageAfterAccessGrant } from "../event-room-access-code-cookie";

describe("SSR/client boundary after host_code grant", () => {
  it("requires hard reload when SSR shell has no room children", () => {
    expect(shouldHardReloadRoomAfterAccessGrant(true, false)).toBe(true);
    expect(shouldHardReloadRoomAfterAccessGrant(true, true)).toBe(false);
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
