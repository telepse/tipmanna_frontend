export type TvChannelRowMetrics = {
  encounters: number;
  comments: number;
};

type ChannelMetricsBatchResponse = {
  metrics?: Record<
    string,
    | {
        encounters?: number;
        comments?: number;
        restricted?: boolean;
      }
    | { restricted: true }
  >;
};

function parseRowMetrics(metrics: unknown): TvChannelRowMetrics | null {
  if (!metrics || typeof metrics !== "object") return null;
  if (
    "restricted" in metrics &&
    (metrics as { restricted?: boolean }).restricted
  ) {
    return null;
  }
  const row = metrics as { encounters?: unknown; comments?: unknown };
  return {
    encounters: typeof row.encounters === "number" ? row.encounters : 0,
    comments: typeof row.comments === "number" ? row.comments : 0,
  };
}

/** Client-side batch metrics lookup for TV playlist / schedule rows. */
export async function fetchTvChannelMetricsBatch(
  channelIds: string[]
): Promise<Record<string, TvChannelRowMetrics>> {
  const base = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(
    /\/$/,
    ""
  );
  const unique = [...new Set(channelIds.map(id => id.trim()).filter(Boolean))];
  if (!base || unique.length === 0) return {};

  try {
    const res = await fetch(`${base}/contents/channels/metrics/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelIds: unique.slice(0, 50) }),
      credentials: "include",
    });
    if (!res.ok) return {};

    const json = (await res.json()) as ChannelMetricsBatchResponse;
    const out: Record<string, TvChannelRowMetrics> = {};
    for (const [channelId, metrics] of Object.entries(json.metrics ?? {})) {
      const parsed = parseRowMetrics(metrics);
      if (parsed) out[channelId] = parsed;
    }
    return out;
  } catch {
    return {};
  }
}

/** @deprecated Prefer {@link fetchTvChannelMetricsBatch}. */
export async function fetchTvChannelEncountersBatch(
  channelIds: string[]
): Promise<Record<string, number>> {
  const batch = await fetchTvChannelMetricsBatch(channelIds);
  const out: Record<string, number> = {};
  for (const [channelId, metrics] of Object.entries(batch)) {
    out[channelId] = metrics.encounters;
  }
  return out;
}
