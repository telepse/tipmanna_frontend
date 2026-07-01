import type { MetadataRoute } from "next";
import { EXPLORE_EVENT_TYPE_OPTIONS } from "@/lib/event-type-options";
import { getPrimaryOrigin } from "@/lib/site-config";

const TV_ORIGIN = getPrimaryOrigin().replace(/\/$/, "");

async function fetchDiscoveryProgramUrls(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/contents/programs/discovery?limit=40`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ landingUrl?: string | null }>;
    if (!Array.isArray(rows)) return [];
    return rows
      .map(row => row.landingUrl)
      .filter(
        (url): url is string => typeof url === "string" && url.startsWith("/")
      )
      .map(path => `${TV_ORIGIN}${path}`);
  } catch {
    return [];
  }
}

async function fetchPublicVideoUrls(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/contents/latest?limit=50`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as unknown;
    const rows = Array.isArray(raw)
      ? raw
      : raw &&
          typeof raw === "object" &&
          "data" in raw &&
          Array.isArray((raw as { data: unknown }).data)
        ? (raw as { data: Array<{ event?: { id?: string } }> }).data
        : [];
    return rows
      .map(row => row.event?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .map(id => `${TV_ORIGIN}/content/${id}`);
  } catch {
    return [];
  }
}

async function fetchLiveChannelUrls(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/contents/live-streams?limit=40`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as {
      live?: Array<{ event?: { id?: string } }>;
      upcoming?: Array<{ event?: { id?: string } }>;
    };
    const origin = TV_ORIGIN;
    const ids = new Set<string>();
    for (const bucket of [raw.live, raw.upcoming]) {
      if (!Array.isArray(bucket)) continue;
      for (const row of bucket) {
        const id = row.event?.id?.trim();
        if (id) ids.add(id);
      }
    }
    return [...ids].map(id => `${origin}/channel/${id}`);
  } catch {
    return [];
  }
}

async function fetchCommunityUrls(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/communities/explore-catalog`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as {
      topByTips?: Array<{ id?: string }>;
      alphabetical?: Array<{ id?: string }>;
    };
    const rows = [
      ...(Array.isArray(raw.topByTips) ? raw.topByTips : []),
      ...(Array.isArray(raw.alphabetical) ? raw.alphabetical : []),
    ];
    const origin = TV_ORIGIN;
    const seen = new Set<string>();
    return rows
      .map(row => row.id?.trim())
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .filter(id => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(id => `${origin}/community/${encodeURIComponent(id)}/join`);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tvOrigin = TV_ORIGIN;
  const [programUrls, contentUrls, communityUrls, channelUrls] =
    await Promise.all([
      fetchDiscoveryProgramUrls(),
      fetchPublicVideoUrls(),
      fetchCommunityUrls(),
      fetchLiveChannelUrls(),
    ]);

  const tvRoutes = ["/explore", "/tv", "/partner", "/join"].map(path => ({
    url: `${tvOrigin}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/explore" ? 1 : 0.8,
  }));

  const categoryRoutes = EXPLORE_EVENT_TYPE_OPTIONS.map(opt => ({
    url: `${tvOrigin}/discover/${opt.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const discoveryRoutes: MetadataRoute.Sitemap = [
    {
      url: `${tvOrigin}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    ...categoryRoutes,
    ...programUrls.map(url => ({
      url,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  const videoRoutes = contentUrls.slice(0, 100).map(url => ({
    url,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const communityRoutes = communityUrls.slice(0, 100).map(url => ({
    url,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));

  const channelRoutes = channelUrls.slice(0, 50).map(url => ({
    url,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.65,
  }));

  return [
    ...tvRoutes,
    ...discoveryRoutes,
    ...videoRoutes,
    ...communityRoutes,
    ...channelRoutes,
  ];
}
