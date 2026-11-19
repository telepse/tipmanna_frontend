import { describe, expect, it } from "vitest";

import { shouldHardReloadRoomAfterAccessGrant } from "../event-room-access-gate.util";

describe("shouldHardReloadRoomAfterAccessGrant", () => {
  it("reloads when access granted but SSR shell has no room children", () => {
    expect(shouldHardReloadRoomAfterAccessGrant(true, false)).toBe(true);
  });

  it("does not reload when room children are already mounted", () => {
    expect(shouldHardReloadRoomAfterAccessGrant(true, true)).toBe(false);
  });

  it("does not reload while access is still denied", () => {
    expect(shouldHardReloadRoomAfterAccessGrant(false, false)).toBe(false);
  });
});
