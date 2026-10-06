import { describe, expect, it } from "vitest";

import { resolveHostPayoutSummaryUiState } from "@/lib/host-payout-summary-ui-state";

describe("resolveHostPayoutSummaryUiState", () => {
  it("is pending while host session is loading", () => {
    expect(
      resolveHostPayoutSummaryUiState({
        hostSessionLoading: true,
        hostSessionActive: false,
        swrLoading: false,
        hasData: false,
        isError: false,
      })
    ).toBe("pending");
  });

  it("is ready when host session is inactive and not loading", () => {
    expect(
      resolveHostPayoutSummaryUiState({
        hostSessionLoading: false,
        hostSessionActive: false,
        swrLoading: false,
        hasData: false,
        isError: false,
      })
    ).toBe("ready");
  });

  it("is pending while SWR is loading for active session", () => {
    expect(
      resolveHostPayoutSummaryUiState({
        hostSessionLoading: false,
        hostSessionActive: true,
        swrLoading: true,
        hasData: false,
        isError: false,
      })
    ).toBe("pending");
  });

  it("is pending until data is defined for active session", () => {
    expect(
      resolveHostPayoutSummaryUiState({
        hostSessionLoading: false,
        hostSessionActive: true,
        swrLoading: false,
        hasData: false,
        isError: false,
      })
    ).toBe("pending");
  });

  it("is error when fetch failed for active session", () => {
    expect(
      resolveHostPayoutSummaryUiState({
        hostSessionLoading: false,
        hostSessionActive: true,
        swrLoading: false,
        hasData: false,
        isError: true,
      })
    ).toBe("error");
  });

  it("stays ready with last-good data when revalidate fails", () => {
    expect(
      resolveHostPayoutSummaryUiState({
        hostSessionLoading: false,
        hostSessionActive: true,
        swrLoading: false,
        hasData: true,
        isError: true,
      })
    ).toBe("ready");
  });

  it("is ready with settled data including true zeros", () => {
    expect(
      resolveHostPayoutSummaryUiState({
        hostSessionLoading: false,
        hostSessionActive: true,
        swrLoading: false,
        hasData: true,
        isError: false,
      })
    ).toBe("ready");
  });
});
