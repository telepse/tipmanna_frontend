export type HostPayoutSummaryUiState = "pending" | "error" | "ready";

export function resolveHostPayoutSummaryUiState(opts: {
  hostSessionLoading: boolean;
  hostSessionActive: boolean;
  swrLoading: boolean;
  hasData: boolean;
  isError: boolean;
}): HostPayoutSummaryUiState {
  if (opts.hostSessionLoading) return "pending";
  if (!opts.hostSessionActive) return "ready";
  if (opts.isError && !opts.hasData) return "error";
  if (opts.swrLoading || !opts.hasData) return "pending";
  return "ready";
}

export function isHostPayoutSummaryPending(
  state: HostPayoutSummaryUiState
): boolean {
  return state === "pending";
}
