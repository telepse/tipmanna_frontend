/* eslint-disable @typescript-eslint/no-explicit-any */
import { EXPLORE_FEED_BOOT_COUNT } from "@/lib/explore-feed-prefetch-cache";

export type ExploreSsrBootPayload = {
  items: any[];
  seed: string;
  bucketId: number;
};

/** Fail-open cap so SSR boot fetch cannot block the page indefinitely. */
export const SSR_BOOT_FETCH_TIMEOUT_MS = 5000;

export function serializeExploreSsrBootScript(
  payload: ExploreSsrBootPayload
): string {
  return `window.__EXPLORE_SSR_BOOT__=${JSON.stringify(payload).replace(/</g, "\\u003c")};`;
}

export async function fetchExploreSsrBoot(): Promise<ExploreSsrBootPayload | null> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return null;
  try {
    const res = await fetch(
      `${base}/contents/feed/default-boot?count=${EXPLORE_FEED_BOOT_COUNT}`,
      {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(SSR_BOOT_FETCH_TIMEOUT_MS),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ExploreSsrBootPayload;
    if (!Array.isArray(data.items) || data.items.length === 0) return null;
    return {
      items: data.items,
      seed: typeof data.seed === "string" ? data.seed : "",
      bucketId: typeof data.bucketId === "number" ? data.bucketId : 0,
    };
  } catch {
    return null;
  }
}
