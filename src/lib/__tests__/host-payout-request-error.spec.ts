import { describe, expect, it } from "vitest";
import { hostPayoutRequestErrorMessage } from "../host-payout-request-error";

describe("host-payout-request-error", () => {
  it("prefers cooldown date from validation body", () => {
    const msg = hostPayoutRequestErrorMessage("Could not submit", {
      error: {
        reasons: ["cooldown"],
        cooldownEndsAt: "2026-09-30T12:00:00.000Z",
      },
    });
    expect(msg).toMatch(/cooldown active until/i);
  });

  it("maps primary reason when no cooldown date", () => {
    const msg = hostPayoutRequestErrorMessage("Could not submit", {
      error: { reasons: ["no_balance"] },
    });
    expect(msg).toBe("No pending balance");
  });
});
