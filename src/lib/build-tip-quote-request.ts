import type { EnrichedRoomCharacter } from "@/lib/merge-tip-config";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export type TipQuoteLine = {
  itemId: string;
  characterId: string;
  name: string;
  priceMinor: number;
  qty: number;
};

/**
 * Build POST /tip-quote JSON body from cart selection. Returns null if cart is empty.
 */
export function buildTipQuoteRequestBody(
  eventId: string,
  configVersion: number,
  surface: string,
  tipsForTotals: string[],
  catalog: EnrichedRoomCharacter[],
  textUnitPrice: number
): {
  eventId: string;
  configVersion: number;
  surface: string;
  lines: TipQuoteLine[];
  textLine?: { priceMinor: number; qty: 1 };
} | null {
  const lines: TipQuoteLine[] = [];
  const counts: Record<string, number> = {};
  for (const name of tipsForTotals) {
    if (name === "Text") continue;
    counts[name] = (counts[name] || 0) + 1;
  }
  for (const [name, qty] of Object.entries(counts)) {
    const c = catalog.find(x => x.name === name);
    if (!c?.tipItemId || c.tipItemId === "__text__") return null;
    lines.push({
      itemId: c.tipItemId,
      characterId: c.id,
      name: c.name,
      priceMinor: Math.round(c.price * 100),
      qty,
    });
  }

  let textLine: { priceMinor: number; qty: 1 } | undefined;
  if (tipsForTotals.includes("Text")) {
    textLine = { priceMinor: Math.round(textUnitPrice * 100), qty: 1 };
  }

  if (lines.length === 0 && !textLine) return null;

  return {
    eventId,
    configVersion,
    surface,
    lines,
    ...(textLine ? { textLine } : {}),
  };
}

export async function postTipQuote(
  body: NonNullable<ReturnType<typeof buildTipQuoteRequestBody>>
): Promise<{ quoteId: string }> {
  const res = await fetch(`${apiBase()}/tip-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as {
    quoteId?: string;
    message?: string;
  };
  if (!res.ok || !j.quoteId) {
    throw new Error(
      typeof j.message === "string" ? j.message : "Could not lock tip total"
    );
  }
  return { quoteId: j.quoteId };
}
