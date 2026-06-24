import type { MetadataRoute } from "next";
import {
  getDiscoveryAbsoluteUrl,
  SITE_URL,
} from "@/lib/site-config";

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
      .filter((url): url is string => typeof url === "string" && url.startsWith("/"))
      .map(path => getDiscoveryAbsoluteUrl(path));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tvOrigin = SITE_URL.replace(/\/$/, "");
  const programUrls = await fetchDiscoveryProgramUrls();

  const tvRoutes = ["/explore", "/tv", "/partner"].map(path => ({
    url: `${tvOrigin}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/explore" ? 1 : 0.8,
  }));

  const discoveryRoutes: MetadataRoute.Sitemap = [
    {
      url: getDiscoveryAbsoluteUrl("/discover"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...programUrls.map(url => ({
      url,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  return [...discoveryRoutes, ...tvRoutes];
}
