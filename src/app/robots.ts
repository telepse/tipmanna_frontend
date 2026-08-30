import type { MetadataRoute } from "next";
import { getPrimaryOrigin } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const tvOrigin = getPrimaryOrigin().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/icons/"],
      },
    ],
    sitemap: [`${tvOrigin}/sitemap.xml`, `${tvOrigin}/video-sitemap.xml`],
  };
}
