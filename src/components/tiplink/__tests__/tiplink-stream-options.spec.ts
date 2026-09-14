import { describe, expect, it } from "vitest";

import { tipLinkGlobalStreamOptions } from "@/lib/tiplink-stream-options";

describe("tipLinkGlobalStreamOptions", () => {
  it("uses tiplink surface telemetry label", () => {
    expect(tipLinkGlobalStreamOptions("event-123")).toEqual({
      eventId: "event-123",
      surface: "tiplink",
    });
  });
});
