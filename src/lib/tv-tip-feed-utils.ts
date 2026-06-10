export type TvTipFeedMessage = {
  id: string;
  sender: string;
  text: string;
  tip: number;
  purchasedSummary: string;
  event?: {
    id: string;
    previewVideoUrl: string | null;
  };
};

const FEED_MAX = 20;

/** Normalize API/Pusher payload into a feed row. */
export function rawToTipFeedMessage(raw: unknown): TvTipFeedMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : null;
  if (!id) return null;

  const eventRaw = r.event as Record<string, unknown> | undefined;
  const event =
    eventRaw && typeof eventRaw.id === "string"
      ? {
          id: eventRaw.id,
          previewVideoUrl:
            typeof eventRaw.previewVideoUrl === "string"
              ? eventRaw.previewVideoUrl
              : null,
        }
      : undefined;

  if (typeof r.tip === "number" || typeof r.sender === "string") {
    return {
      id,
      sender: String(r.sender ?? "Someone"),
      text: String(r.text ?? "I just sent"),
      tip: typeof r.tip === "number" ? r.tip : Number(r.amount) || 0,
      purchasedSummary:
        typeof r.purchasedSummary === "string"
          ? r.purchasedSummary
          : Array.isArray(r.selectedTips)
            ? (r.selectedTips as string[]).join(", ")
            : "",
      event,
    };
  }

  return {
    id,
    sender: String(r.sender ?? "Tipper"),
    text: String(r.text ?? ""),
    tip: typeof r.tip === "number" ? r.tip : 0,
    purchasedSummary:
      typeof r.purchasedSummary === "string" ? r.purchasedSummary : "",
    event,
  };
}

/** Prepend with id dedupe; cap list length. */
export function prependTipFeedDeduped(
  prev: TvTipFeedMessage[],
  msg: TvTipFeedMessage,
  max = FEED_MAX
): TvTipFeedMessage[] {
  const filtered = prev.filter(p => p.id !== msg.id);
  return [msg, ...filtered].slice(0, max);
}

/** Replace feed from HTTP bootstrap. */
export function normalizeTipFeedList(raw: unknown): TvTipFeedMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: TvTipFeedMessage[] = [];
  for (const item of raw) {
    const msg = rawToTipFeedMessage(item);
    if (msg) out.push(msg);
  }
  const byId = new Map<string, TvTipFeedMessage>();
  for (const m of out) byId.set(m.id, m);
  return Array.from(byId.values()).slice(0, FEED_MAX);
}

/** Merge refetched rows into existing feed; keep prior rows when refetch is empty. */
export function mergeTipFeedDeduped(
  prev: TvTipFeedMessage[],
  incoming: TvTipFeedMessage[],
  max = FEED_MAX
): TvTipFeedMessage[] {
  if (!incoming.length) return prev;
  const byId = new Map<string, TvTipFeedMessage>();
  for (const m of incoming) byId.set(m.id, m);
  for (const m of prev) {
    if (!byId.has(m.id)) byId.set(m.id, m);
  }
  return Array.from(byId.values()).slice(0, max);
}
