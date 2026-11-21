import { describe, expect, it } from "vitest";

import {
  formatRecordedStopReason,
  formatProviderExecutionModeLabel,
  showPublisherSurface,
  startAcceptedMessage,
} from "../native-broadcast-panel-status";

describe("native-broadcast-panel-status", () => {
  it("formats terminal timeout copy", () => {
    expect(formatRecordedStopReason("maxStartingDuration")).toMatch(/timed out/i);
  });

  it("appends OAuth hint when provider job failed invalid_grant", () => {
    expect(
      formatRecordedStopReason(
        "maxStartingDuration",
        'Google token refresh failed: { "error": "invalid_grant" }'
      )
    ).toMatch(/E1-FA-01/i);
  });

  it("uses stamped provider mode for start message", () => {
    expect(
      startAcceptedMessage({
        id: "b",
        ownerHostId: "h",
        phase: "starting",
        billableEndedAt: null,
        recordedStopReason: null,
        eventChannelId: null,
        initiatedByUserId: null,
        initiatedByRole: null,
        providerIngestActive: false,
        dailyRoomReady: false,
        youtubeBroadcastPrepared: false,
        providerExecutionMode: "real",
        liveStartedAt: null,
        updatedAt: "",
      })
    ).toContain("real provider");
  });

  it("hides publisher chrome after terminal stop", () => {
    expect(
      showPublisherSurface({
        id: "b",
        ownerHostId: "h",
        phase: "stopped",
        billableEndedAt: "2026-10-20T18:13:00.000Z",
        recordedStopReason: "maxStartingDuration",
        eventChannelId: null,
        initiatedByUserId: null,
        initiatedByRole: null,
        providerIngestActive: false,
        dailyRoomReady: false,
        youtubeBroadcastPrepared: false,
        providerExecutionMode: "real",
        liveStartedAt: null,
        updatedAt: "",
      })
    ).toBe(false);
  });

  it("labels unknown provider mode neutrally", () => {
    expect(formatProviderExecutionModeLabel(null)).toBe("provider mode pending");
  });
});
