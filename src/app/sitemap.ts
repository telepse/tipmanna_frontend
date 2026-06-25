import type { MetadataRoute } from "next";
import { EXPLORE_EVENT_TYPE_OPTIONS } from "@/lib/event-type-options";
import { getDiscoveryAbsoluteUrl, SITE_URL } from "@/lib/site-config";

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
      .map(path => getDiscoveryAbsoluteUrl(path));
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
      .map(id => `${SITE_URL.replace(/\/$/, "")}/content/${id}`);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tvOrigin = SITE_URL.replace(/\/$/, "");
  const [programUrls, contentUrls] = await Promise.all([
    fetchDiscoveryProgramUrls(),
    fetchPublicVideoUrls(),
  ]);

  const tvRoutes = ["/explore", "/tv", "/partner"].map(path => ({
    url: `${tvOrigin}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/explore" ? 1 : 0.8,
  }));

  const categoryRoutes = EXPLORE_EVENT_TYPE_OPTIONS.map(opt => ({
    url: getDiscoveryAbsoluteUrl(`/discover/${opt.slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const discoveryRoutes: MetadataRoute.Sitemap = [
    {
      url: getDiscoveryAbsoluteUrl("/discover"),
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

  return [...tvRoutes, ...discoveryRoutes, ...videoRoutes];
}
