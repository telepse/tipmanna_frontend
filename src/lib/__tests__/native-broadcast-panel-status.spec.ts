import { describe, expect, it } from "vitest";

import {
  formatRecordedStopReason,
  formatProviderExecutionModeLabel,
  showPublisherSurface,
  startAcceptedMessage,
  streamingOutputStatus,
} from "../native-broadcast-panel-status";
import type { EventBroadcastRow } from "../event-broadcast-client";

function row(partial: Partial<EventBroadcastRow>): EventBroadcastRow {
  return {
    id: "b",
    ownerHostId: "h",
    phase: "live",
    billableEndedAt: null,
    recordedStopReason: null,
    eventChannelId: null,
    initiatedByUserId: null,
    initiatedByRole: null,
    providerIngestActive: true,
    dailyRoomReady: true,
    youtubeBroadcastPrepared: true,
    providerExecutionMode: "real",
    liveStartedAt: "2026-11-05T13:44:29.000Z",
    updatedAt: "",
    ...partial,
  };
}

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

  it("does not treat a live room as YouTube ingest or playable video", () => {
    const status = streamingOutputStatus(
      row({
        rtmpStartAcknowledged: false,
        youtubeIngestActive: false,
      })
    );
    expect(status.room).toBe("Daily room ready");
    expect(status.youtubeIngest).toMatch(/not confirmed/);
    expect(status.playable).toBe("Playable video not confirmed");
    expect(status.youtubeIngest).not.toMatch(/ingest active/);
  });

  it("keeps an RTMP acknowledgement distinct from YouTube ingest", () => {
    const status = streamingOutputStatus(
      row({ rtmpStartAcknowledged: true, youtubeIngestActive: false })
    );
    expect(status.rtmp).toMatch(/acknowledged/);
    expect(status.youtubeIngest).toMatch(/not confirmed/);
    expect(status.playable).toBe("Playable video not confirmed");
  });

  it("reports YouTube ingest only from the ingest flag", () => {
    const status = streamingOutputStatus(row({ youtubeIngestActive: true }));
    expect(status.youtubeIngest).toBe("YouTube ingest active");
    expect(status.playable).toMatch(/receiving media/);
  });
});
