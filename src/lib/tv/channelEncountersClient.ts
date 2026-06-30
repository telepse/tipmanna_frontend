type ChannelMetricsBatchResponse = {
  metrics?: Record<
    string,
    { encounters?: number; restricted?: boolean } | { restricted: true }
  >;
};

/** Client-side batch encounter lookup for TV playlist preview rows. */
export async function fetchTvChannelEncountersBatch(
  channelIds: string[]
): Promise<Record<string, number>> {
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
    const out: Record<string, number> = {};
    for (const [channelId, metrics] of Object.entries(json.metrics ?? {})) {
      if (
        metrics &&
        !("restricted" in metrics && metrics.restricted) &&
        typeof metrics.encounters === "number"
      ) {
        out[channelId] = metrics.encounters;
      }
    }
    return out;
  } catch {
    return {};
  }
}
