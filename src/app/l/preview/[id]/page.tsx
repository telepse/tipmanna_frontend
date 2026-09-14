import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getTipLinkPreviewAction } from "@/actions/tiplink";
import { TipLinkLandingClient } from "@/components/tiplink/tiplink-landing-client";
import { TipLinkLoadRetry } from "@/components/tiplink/tiplink-load-retry";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";

type Props = {
  params: Promise<{ id: string }>;
};

const loadTipLinkPreview = cache(async (id: string) => {
  return getTipLinkPreviewAction(id);
});

function isTipLinkPreviewNotFound(
  res: Awaited<ReturnType<typeof loadTipLinkPreview>>
) {
  return res.httpStatus === 404;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "TipLink preview · Tipmanna",
    robots: { index: false, follow: false },
  };
}

export default async function TipLinkPreviewPage({ params }: Props) {
  const { id } = await params;
  const res = await loadTipLinkPreview(id);

  if (!res.success || !res.data) {
    if (isTipLinkPreviewNotFound(res)) {
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

  return (
    <TipLinkLandingClient
      payload={payload}
      characters={characters}
      characterSets={characterSets}
      preview
    />
  );
}
