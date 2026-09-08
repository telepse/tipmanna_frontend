import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getEventByIdAction } from "@/actions/events";
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
  const [eventRes, globalCharactersRes, globalCharacterSetsRes] =
    await Promise.all([
      getEventByIdAction(payload.eventId),
      getCharactersForTipping(),
      getAllCharacterSets(),
    ]);

  const eventCatalog = parseEventCharacterCatalog(
    eventRes.success ? eventRes.data?.characterSets : []
  );
  const characterSets =
    eventCatalog.characterSets.length > 0
      ? eventCatalog.characterSets
      : Array.isArray(globalCharacterSetsRes.data)
        ? globalCharacterSetsRes.data
        : [];
  const characters =
    eventCatalog.tippingCharacters.length > 0
      ? eventCatalog.tippingCharacters
      : Array.isArray(globalCharactersRes.data)
        ? globalCharactersRes.data
        : [];

  return (
    <TipLinkLandingClient
      payload={payload}
      characters={characters}
      characterSets={characterSets}
      preview
    />
  );
}
