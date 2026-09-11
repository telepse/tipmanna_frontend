import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublicTipLinkAction } from "@/actions/tiplink";
import { TipLinkLandingClient } from "@/components/tiplink/tiplink-landing-client";
import { TipLinkLoadRetry } from "@/components/tiplink/tiplink-load-retry";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import { getPrimaryOrigin } from "@/lib/site-config";
import { buildVideoObjectJsonLd } from "@/lib/structured-data";
import {
  buildOgImageMetadata,
  resolveVideoOgImageUrl,
} from "@/lib/video-og-image";

type Props = {
  params: Promise<{ slug: string }>;
};

const loadPublicTipLink = cache(async (slug: string) => {
  return getPublicTipLinkAction(slug);
});

function isTipLinkNotFound(res: Awaited<ReturnType<typeof loadPublicTipLink>>) {
  return res.httpStatus === 404;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await loadPublicTipLink(slug);
  if (!res.success || !res.data) {
    return { title: "TipLink · Tipmanna", robots: { index: false } };
  }
  const { channel, tipLink, host } = res.data;
  const origin = getPrimaryOrigin();
  const url = `${origin}${tipLink.landingUrl}`;
  const image = tipLink.bannerUrl?.trim()
    ? tipLink.bannerUrl
    : resolveVideoOgImageUrl(channel.url);

  return {
    title: `${channel.title} · @${host.username}`,
    description:
      tipLink.pitch ?? channel.description ?? `TipLink by @${host.username}`,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title: channel.title,
      description: tipLink.pitch ?? channel.description ?? undefined,
      url,
      ...buildOgImageMetadata(image),
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title: channel.title,
      description: tipLink.pitch ?? channel.description ?? undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function TipLinkPage({ params }: Props) {
  const { slug } = await params;
  const res = await loadPublicTipLink(slug);

  if (!res.success || !res.data) {
    if (isTipLinkNotFound(res)) {
      notFound();
    }
    return (
      <div className="min-h-screen bg-black">
        <TipLinkLoadRetry message={res.message ?? res.error ?? undefined} />
      </div>
    );
  }

  const payload = res.data;
  const eventCatalog = parseEventCharacterCatalog(payload.characterSets ?? []);
  const characterSets = eventCatalog.characterSets;
  const characters = eventCatalog.tippingCharacters;

  const origin = getPrimaryOrigin();
  const jsonLd = buildVideoObjectJsonLd({
    title: payload.channel.title,
    hostName: payload.host.fullName,
    url: `${origin}${payload.tipLink.landingUrl}`,
    videoUrl: payload.channel.url,
    description:
      payload.tipLink.pitch ?? payload.channel.description ?? undefined,
    uploadDate: payload.tipLink.createdAt,
    thumbnailUrl:
      payload.tipLink.bannerUrl?.trim() ||
      resolveVideoOgImageUrl(payload.channel.url),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TipLinkLandingClient
        payload={payload}
        characters={characters}
        characterSets={characterSets}
      />
    </>
  );
}
