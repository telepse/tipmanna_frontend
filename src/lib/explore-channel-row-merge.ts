/** Fill-in merge: keep richer snapshot fields; prefer primary for event tipping fields. */
export function mergeExploreChannelRows(
  primary: Record<string, unknown>,
  secondary?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!secondary) return primary;

  const mergeObjects = (
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...b, ...a };
    for (const key of Object.keys(b)) {
      const av = a[key];
      const bv = b[key];
      if (av === undefined || av === null || av === "") {
        out[key] = bv;
      } else if (
        typeof av === "object" &&
        av !== null &&
        !Array.isArray(av) &&
        typeof bv === "object" &&
        bv !== null &&
        !Array.isArray(bv)
      ) {
        out[key] = mergeObjects(
          av as Record<string, unknown>,
          bv as Record<string, unknown>
        );
      }
    }
    return out;
  };

  const primaryEvent =
    primary.event && typeof primary.event === "object"
      ? (primary.event as Record<string, unknown>)
      : {};
  const secondaryEvent =
    secondary.event && typeof secondary.event === "object"
      ? (secondary.event as Record<string, unknown>)
      : {};

  const merged = mergeObjects(primary, secondary);
  merged.event = mergeObjects(primaryEvent, secondaryEvent);

  for (const key of [
    "community",
    "coOwnerHostUsername",
    "coOwnerName",
    "coOwnerNames",
    "coOwnerApproved",
    "durationSeconds",
    "liveStatus",
    "metrics",
    "contentLanguage",
    "contentCountry",
  ] as const) {
    const pv = primary[key];
    const sv = secondary[key];
    if ((pv === undefined || pv === null || pv === "") && sv != null) {
      merged[key] = sv;
    }
  }

  return merged;
}

export function isExploreReelReadyRow(row: unknown): boolean {
  if (!row || typeof row !== "object") return false;
  const r = row as {
    url?: string;
    restricted?: boolean;
    event?: { username?: string | null };
  };
  if (r.restricted) return false;
  if (typeof r.url !== "string" || !r.url.trim()) return false;
  const username = r.event?.username;
  return typeof username === "string" && username.trim().length > 0;
}
