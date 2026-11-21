import { describe, expect, it } from "vitest";

import { isMockDailyPublisherToken } from "@/lib/daily-publisher-mode";

describe("isMockDailyPublisherToken", () => {
  it("detects mock publisher tokens", () => {
    expect(isMockDailyPublisherToken("mock-publisher-abc12345")).toBe(true);
    expect(isMockDailyPublisherToken("real-jwt-token")).toBe(false);
  });
});
