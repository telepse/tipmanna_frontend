/* eslint-disable @typescript-eslint/no-explicit-any */
import { EXPLORE_FEED_BOOT_COUNT } from "@/lib/explore-feed-prefetch-cache";

export type ExploreSsrBootPayload = {
  items: any[];
  seed: string;
  bucketId: number;
};

export async function fetchExploreSsrBoot(): Promise<ExploreSsrBootPayload | null> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return null;
  try {
    const res = await fetch(
      `${base}/contents/feed/default-boot?count=${EXPLORE_FEED_BOOT_COUNT}`,
      {
        next: { revalidate: 60 },
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
