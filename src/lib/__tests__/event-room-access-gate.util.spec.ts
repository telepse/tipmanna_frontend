import { describe, expect, it } from "vitest";

import { shouldReloadRoomAfterAccessGrant } from "../event-room-access-gate.util";

describe("shouldReloadRoomAfterAccessGrant", () => {
  it("reloads when access granted but SSR shell has no room children", () => {
    expect(shouldReloadRoomAfterAccessGrant(true, false)).toBe(true);
  });

  it("does not reload when room children are already mounted", () => {
    expect(shouldReloadRoomAfterAccessGrant(true, true)).toBe(false);
  });

  it("does not reload while access is still denied", () => {
    expect(shouldReloadRoomAfterAccessGrant(false, false)).toBe(false);
  });
});
