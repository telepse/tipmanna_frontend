import { describe, expect, it } from "vitest";

import { mergeCommunityBankRefreshResult } from "@/lib/tiplink-community-bank-refresh";

describe("mergeCommunityBankRefreshResult", () => {
  it("replaces prior when any community fetch succeeded (including empty next)", () => {
    expect(
      mergeCommunityBankRefreshResult({
        prior: [{ id: "a" }],
        next: [],
        anySuccess: true,
      })
    ).toEqual([]);
    expect(
      mergeCommunityBankRefreshResult({
        prior: [{ id: "a" }],
        next: [{ id: "b" }],
        anySuccess: true,
      })
    ).toEqual([{ id: "b" }]);
  });

  it("keeps prior when total failure and prior is non-empty", () => {
    expect(
      mergeCommunityBankRefreshResult({
        prior: [{ id: "a" }],
        next: [],
        anySuccess: false,
      })
    ).toEqual([{ id: "a" }]);
  });

  it("keeps empty when total failure and prior is empty", () => {
    expect(
      mergeCommunityBankRefreshResult({
        prior: [],
        next: [],
        anySuccess: false,
      })
    ).toEqual([]);
  });
});
