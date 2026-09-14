/** Host GET /events/host/me — array or paginated `{ data: Event[] }`. */

export type HostEventPick = { id: string; eventName: string };

export function parseHostEventsPickList(raw: unknown): HostEventPick[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((e: { id?: string; eventName?: string }) => ({
        id: String(e?.id ?? "").trim(),
        eventName:
          e?.eventName != null && String(e.eventName).trim() !== ""
            ? String(e.eventName)
            : "",
      }))
      .filter(e => e.id);
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return parseHostEventsPickList(o.data);
    if (Array.isArray(o.events)) return parseHostEventsPickList(o.events);
  }
  return [];
}

const COMMUNITY_ACTIVATION_KINDS = new Set(["event_only", "event_and_content"]);

/** Events the host can still attach a new community to (no communityId yet). */
export function parseHostEventsEligibleForCommunity(
  raw: unknown
): HostEventPick[] {
  const rows: {
    id: string;
    eventName: string;
    communityId?: string | null;
    submissionKind?: string | null;
  }[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const e = item as {
        id?: string;
        eventName?: string;
        communityId?: string | null;
        submissionKind?: string | null;
      };
      const id = String(e?.id ?? "").trim();
      if (!id || e.communityId) continue;
      const kind = e.submissionKind?.trim() ?? "";
      if (!COMMUNITY_ACTIVATION_KINDS.has(kind)) continue;
      rows.push({
        id,
        eventName:
          e?.eventName != null && String(e.eventName).trim() !== ""
            ? String(e.eventName)
            : id,
      });
    }
  } else if (raw != null && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data))
      return parseHostEventsEligibleForCommunity(o.data);
    if (Array.isArray(o.events)) {
      return parseHostEventsEligibleForCommunity(o.events);
    }
  }
  return rows.map(({ id, eventName }) => ({ id, eventName }));
}
