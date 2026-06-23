import type { MetadataRoute } from "next";
import {
  DISCOVERY_SITE_URL,
  getDiscoveryAbsoluteUrl,
  getPublicAbsoluteUrl,
  SITE_URL,
} from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const tvOrigin = SITE_URL.replace(/\/$/, "");
  const discoveryOrigin = DISCOVERY_SITE_URL.replace(/\/$/, "");

  const tvRoutes = ["/explore", "/tv", "/partner"].map(path => ({
    url: `${tvOrigin}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/explore" ? 1 : 0.8,
  }));

  const discoveryRoutes = ["/discover"].map(path => ({
    url: getDiscoveryAbsoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1,
  }));

  return [...discoveryRoutes, ...tvRoutes];
}
