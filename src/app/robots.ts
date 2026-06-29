import type { MetadataRoute } from "next";
import {
  DISCOVERY_SITE_URL,
  getDiscoveryAbsoluteUrl,
  SITE_URL,
} from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const tvOrigin = SITE_URL.replace(/\/$/, "");
  const discoveryOrigin = DISCOVERY_SITE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/icons/"],
      },
    ],
    sitemap: [
      `${tvOrigin}/sitemap.xml`,
      `${tvOrigin}/video-sitemap.xml`,
      `${discoveryOrigin}/sitemap.xml`,
      getDiscoveryAbsoluteUrl("/sitemap.xml"),
    ],
  };
}
