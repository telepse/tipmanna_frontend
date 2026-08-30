"use client";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

export type ChannelPlaybackRouteResult = {
  route: "channel" | "explore-reel";
  liveStatus: string;
};

/** YouTube-aware live routing for Discover / Explore handoffs. */
export async function fetchChannelPlaybackRoute(
  channelId: string
): Promise<ChannelPlaybackRouteResult | null> {
  const id = channelId.trim();
  if (!id || !API_BASE) return null;
  try {
    const res = await fetch(
      `${API_BASE}/contents/channels/${encodeURIComponent(id)}/playback-route`,
      { cache: "no-store", credentials: "include" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ChannelPlaybackRouteResult;
    if (data?.route !== "channel" && data?.route !== "explore-reel") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
