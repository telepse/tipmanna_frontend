import type { EventBroadcastRow } from "@/lib/event-broadcast-client";

export function formatProviderExecutionModeLabel(
  mode: string | null | undefined
): string {
  const m = mode?.trim();
  if (m === "real") return "real provider";
  if (m === "mock") return "mock provider";
  return "provider mode pending";
}

export function formatRecordedStopReason(reason: string | null | undefined): string {
  const r = reason?.trim();
  if (!r) return "Broadcast ended.";
  if (r === "maxStartingDuration") {
    return "Broadcast stopped: live confirmation timed out (max starting duration). Refresh status — do not wait for live on this session.";
  }
  if (r === "host_stop") return "Broadcast stopped by host.";
  if (r === "maxLiveDuration") return "Broadcast stopped: maximum live duration reached.";
  return `Broadcast stopped (${r}).`;
}

export function startAcceptedMessage(row: EventBroadcastRow | null): string {
  if (!row) return "Start request accepted.";
  return `Start accepted (${formatProviderExecutionModeLabel(row.providerExecutionMode)}).`;
}

export function showPublisherSurface(row: EventBroadcastRow | null): boolean {
  return row?.phase === "preflight" || row?.phase === "starting" || row?.phase === "live";
}
