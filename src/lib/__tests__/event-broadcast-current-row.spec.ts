import { describe, expect, it } from "vitest";

import { resolveEventBroadcastCurrentRow } from "@/lib/event-broadcast-current-row";
import type { EventBroadcastRow } from "@/lib/event-broadcast-client";

const active: EventBroadcastRow = {
  id: "new-broadcast",
  ownerHostId: "host-1",
  phase: "starting",
  billableEndedAt: null,
  recordedStopReason: null,
  eventChannelId: "ch-1",
  initiatedByUserId: null,
  initiatedByRole: null,
  providerIngestActive: true,
  dailyRoomReady: true,
  youtubeBroadcastPrepared: true,
  providerExecutionMode: "mock",
  liveStartedAt: null,
  updatedAt: "2026-10-22T12:00:00.000Z",
};

describe("resolveEventBroadcastCurrentRow", () => {
  it("prefers active broadcast over terminal summary", () => {
    const row = resolveEventBroadcastCurrentRow({
      broadcast: active,
      terminal: {
        id: "old-stopped",
        recordedStopReason: "maxStartingDuration",
        providerExecutionMode: "real",
        billableEndedAt: null,
        lastProviderError: null,
      },
    });
    expect(row?.id).toBe("new-broadcast");
    expect(row?.phase).toBe("starting");
  });

  it("synthesizes stopped row when only terminal is present", () => {
    const row = resolveEventBroadcastCurrentRow({
      broadcast: null,
      terminal: {
        id: "old-stopped",
        recordedStopReason: "host_stop",
        providerExecutionMode: "mock",
        billableEndedAt: "2026-10-22T11:00:00.000Z",
        lastProviderError: null,
      },
    });
    expect(row?.phase).toBe("stopped");
    expect(row?.id).toBe("old-stopped");
  });
});
