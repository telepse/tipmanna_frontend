import type { TipLinkHydratePayload } from "@/actions/tiplink";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Browser-direct hydrate — avoids an extra Next.js server-action hop when the public API is reachable.
 * Retries once on transient failure; returns null so callers can fall back to a server action.
 */
export async function fetchPublicTipLinkHydrate(
  slug: string
): Promise<TipLinkHydratePayload | null> {
  const base = apiBase();
  const normalizedSlug = slug.trim();
  if (!base || !normalizedSlug) return null;

  const url = `${base}/tiplinks/${encodeURIComponent(normalizedSlug)}/hydrate`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 404) return null;
      if (res.ok) {
        return (await res.json()) as TipLinkHydratePayload;
      }
    } catch {
      // retry below
    }
    if (attempt === 0) {
      await sleep(400);
    }
  }

  return null;
}
