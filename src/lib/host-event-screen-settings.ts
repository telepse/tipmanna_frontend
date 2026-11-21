import { normalizeScreenFunnelPosition } from "@/lib/screen-funnel-position";

export type HostEventScreenSettingsSnapshot = {
  background: string;
  moneyFor: string;
  showLatest: boolean;
  hideProgressAmount: boolean;
  showPinnedOnScreen: boolean;
  funnelPosition: ReturnType<typeof normalizeScreenFunnelPosition>;
  performers: { id?: string; name: string; amountReceived?: string }[];
  projects: { id?: string; name: string; amountReceived?: string }[];
  tipUsageDisclosure: Array<{
    id?: string;
    usageType: "PERFORMER_WELFARE" | "HOST_WELFARE" | "COHOST_WELFARE";
    percentage: number;
    customLabel?: string | null;
  }>;
};

/** Map GET /hosts/:hostId/events/:eventId (or full event) into modal form snapshot. */
export function mapHostEventToScreenSettingsSnapshot(
  raw: Record<string, unknown>
): HostEventScreenSettingsSnapshot {
  const performers = Array.isArray(raw.performers)
    ? (raw.performers as { id?: string; name?: string }[]).map(p => ({
        id: p.id,
        name: p.name ?? "",
      }))
    : [];
  const projects = Array.isArray(raw.projects)
    ? (raw.projects as { id?: string; name?: string }[]).map(p => ({
        id: p.id,
        name: p.name ?? "",
      }))
    : [];
  const tipUsageDisclosure = Array.isArray(raw.tipUsageDisclosure)
    ? (raw.tipUsageDisclosure as HostEventScreenSettingsSnapshot["tipUsageDisclosure"])
    : [];

  return {
    background:
      typeof raw.eventBackground === "string" ? raw.eventBackground : "",
    moneyFor: typeof raw.moneyFor === "string" ? raw.moneyFor : "",
    showLatest: raw.showLatestAmount === true,
    hideProgressAmount: raw.hideProgressBarAmount === true,
    showPinnedOnScreen: raw.showPinnedOnScreen !== false,
    funnelPosition: normalizeScreenFunnelPosition(
      typeof raw.funnelPosition === "string" ? raw.funnelPosition : undefined
    ),
    performers,
    projects,
    tipUsageDisclosure,
  };
}
