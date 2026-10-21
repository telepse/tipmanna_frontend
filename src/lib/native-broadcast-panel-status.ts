import type { EventBroadcastRow } from "@/lib/event-broadcast-client";

export function formatProviderExecutionModeLabel(
  mode: string | null | undefined
): string {
  const m = mode?.trim();
  if (m === "real") return "real provider";
  if (m === "mock") return "mock provider";
  return "provider mode pending";
}

export function formatProviderJobErrorHint(
  lastProviderError: string | null | undefined
): string | null {
  const e = lastProviderError?.trim();
  if (!e) return null;
  if (e.includes("invalid_grant")) {
    return "Platform YouTube OAuth refresh failed (token expired or revoked). Superadmin must re-complete E1-FA-01 OAuth before another real start.";
  }
  if (e.includes("Google token refresh failed")) {
    return "YouTube platform token refresh failed during live confirmation.";
  }
  return null;
}

export function formatRecordedStopReason(
  reason: string | null | undefined,
  lastProviderError?: string | null
): string {
  const hint = formatProviderJobErrorHint(lastProviderError);
  const r = reason?.trim();
  if (!r) {
    return hint ?? "Broadcast ended.";
  }
  if (r === "maxStartingDuration") {
    const base =
      "Broadcast stopped: live confirmation timed out (max starting duration). Refresh status — do not wait for live on this session.";
    return hint ? `${base} ${hint}` : base;
  }
  if (r === "host_stop") return "Broadcast stopped by host.";
  if (r === "maxLiveDuration") return "Broadcast stopped: maximum live duration reached.";
  const base = `Broadcast stopped (${r}).`;
  return hint ? `${base} ${hint}` : base;
}

export function startAcceptedMessage(row: EventBroadcastRow | null): string {
  if (!row) return "Start request accepted.";
  return `Start accepted (${formatProviderExecutionModeLabel(row.providerExecutionMode)}).`;
}

export function showPublisherSurface(row: EventBroadcastRow | null): boolean {
  return row?.phase === "preflight" || row?.phase === "starting" || row?.phase === "live";
}
