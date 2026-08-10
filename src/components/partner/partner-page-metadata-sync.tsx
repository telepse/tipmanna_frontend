"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  getPartnerMetadataForVariant,
  resolvePartnerMetadataVariant,
} from "@/lib/partner-page-metadata";
import { getPublicAbsoluteUrl } from "@/lib/site-config";

function upsertMeta(
  selector: string,
  attribute: "name" | "property",
  key: string,
  content: string
) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function PartnerPageMetadataSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== "/partner") return;

    const sync = () => {
      const variant = resolvePartnerMetadataVariant({
        section: searchParams.get("section"),
        hash: window.location.hash,
      });
      const meta = getPartnerMetadataForVariant(variant);
      const pageUrl = getPublicAbsoluteUrl(meta.canonicalPath);

      document.title = meta.title;
      upsertMeta(
        'meta[name="description"]',
        "name",
        "description",
        meta.description
      );
      upsertMeta(
        'meta[property="og:title"]',
        "property",
        "og:title",
        meta.title
      );
      upsertMeta(
        'meta[property="og:description"]',
        "property",
        "og:description",
        meta.description
      );
      upsertMeta('meta[property="og:url"]', "property", "og:url", pageUrl);
      upsertMeta(
        'meta[name="twitter:title"]',
        "name",
        "twitter:title",
        meta.title
      );
      upsertMeta(
        'meta[name="twitter:description"]',
        "name",
        "twitter:description",
        meta.description
      );

      let canonical = document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]'
      );
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", pageUrl);
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname, searchParams]);

  return null;
}
