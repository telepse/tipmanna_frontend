import { describe, expect, it } from "vitest";

import {
  isHostTipNotificationKind,
  parseTipNotificationPayload,
  tipNotificationDetailRows,
} from "../tip-notification-display";

describe("tip-notification-display", () => {
  it("detects host tip notification kinds", () => {
    expect(isHostTipNotificationKind("host_tip_received")).toBe(true);
    expect(isHostTipNotificationKind("welcome_first_visit")).toBe(false);
  });

  it("parses structured tip payloads", () => {
    const parsed = parseTipNotificationPayload({
      transactionId: "tx-1",
      amountLabel: "£5.00",
      tipperLabel: "alice",
      hostName: "Host One",
      roomLabel: "Live show",
      tippedAt: "2026-08-27T12:00:00.000Z",
    });
    expect(parsed?.amountLabel).toBe("£5.00");
    const rows = tipNotificationDetailRows(parsed!, { includeHost: true });
    expect(rows.some(r => r.label === "Host")).toBe(true);
    expect(rows.some(r => r.label === "Amount")).toBe(true);
  });
});
