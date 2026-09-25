import { describe, expect, it } from "vitest";
import {
  activeCoOwnerInviteRow,
  coOwnerInvitePhaseFromRows,
} from "@/lib/coowner-invite-phase.util";

describe("coOwnerInvitePhaseFromRows", () => {
  it("returns pending when only pending invites exist", () => {
    expect(coOwnerInvitePhaseFromRows([{ status: "pending" }])).toBe("pending");
  });

  it("returns approved when approved exists alongside pending sibling", () => {
    expect(
      coOwnerInvitePhaseFromRows([
        { status: "pending" },
        { status: "approved" },
      ])
    ).toBe("approved");
  });

  it("returns approved when approved exists alongside declined sibling", () => {
    expect(
      coOwnerInvitePhaseFromRows([
        { status: "declined" },
        { status: "approved" },
      ])
    ).toBe("approved");
  });

  it("returns expired when only expired invites exist", () => {
    expect(coOwnerInvitePhaseFromRows([{ status: "expired" }])).toBe("expired");
  });

  it("returns typing for empty invites", () => {
    expect(coOwnerInvitePhaseFromRows([])).toBe("typing");
    expect(coOwnerInvitePhaseFromRows(undefined)).toBe("typing");
  });
});

describe("activeCoOwnerInviteRow", () => {
  it("prefers approved over pending", () => {
    const row = activeCoOwnerInviteRow([
      { status: "pending", id: "p" },
      { status: "approved", id: "a" },
    ]);
    expect(row?.id).toBe("a");
  });
});
