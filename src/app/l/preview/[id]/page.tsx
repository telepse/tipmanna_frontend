import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getTipLinkPreviewAction } from "@/actions/tiplink";
import { TipLinkLandingClient } from "@/components/tiplink/tiplink-landing-client";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "TipLink preview · Tipmanna",
    robots: { index: false, follow: false },
  };
}

export default async function TipLinkPreviewPage({ params }: Props) {
  const { id } = await params;
  const res = await getTipLinkPreviewAction(id);
  if (!res.success || !res.data) {
    notFound();
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
