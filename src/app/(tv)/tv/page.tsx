/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getAllEventChannels } from "@/actions/events";
import { TVExpressButtons } from "@/components/tv/tv-express-buttons";
import TVFullscreen from "@/components/tv/tv-fullscreen";
import TVPageShell from "@/components/tv/tv-page-shell";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { Metadata } from "next";
import { Suspense } from "react";
import { getPublicFrontendOrigin } from "@/lib/site-config";

interface Props {
  searchParams: Promise<{ videoId?: string }>;
}

/**
 * GENERATE METADATA
 * Handles SEO and Social Media tags for LinkedIn, Twitter, etc.
 */
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { videoId } = await searchParams;
  const { data: channels } = await getAllEventChannels();
  const currentChannel = (channels as any[]).find(
    (ch: { url: string }) => extractYoutubeID(ch.url) === videoId
  );

  if (!currentChannel) return { title: "Tipmanna TV" };

  const imageUrl = currentChannel.event.eventBackground;

  const description = `Join me on Tipmanna TV ${currentChannel.title}.`;

  return {
    metadataBase: new URL(getPublicFrontendOrigin()),
    title: "Tipmanna TV",
    description: description,
    openGraph: {
      title: "Tipmanna TV",
      description: description,
      url: `/tv`,
      siteName: "TipManna",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Tipmanna TV`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Tipmanna TV",
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function TVPage({
  searchParams,
}: {
  searchParams: Promise<{ videoId?: string }>;
}) {
  const { videoId } = await searchParams;

  // Only load critical data
  const [{ data: channels }, { data: characters }, { data: characterSets }] =
    await Promise.all([
      getAllEventChannels(),
      getCharactersForTipping(),
      getAllCharacterSets(),
    ]);

  const currentChannel = (channels as any[])?.find(
    (ch: { url: string }) => extractYoutubeID(ch.url) === videoId
  );

  if (currentChannel && videoId) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <TVFullscreen
          videoId={videoId}
          currentChannel={currentChannel}
        />
      </div>
    );
  }

  return (
    <>
      <section className="w-full p-2">
        <Suspense
          fallback={
            <div className="text-muted-foreground p-4 text-sm">Loading TV…</div>
          }
        >
          <TVPageShell
            channels={channels as any[]}
            characters={characters as any[]}
            characterSets={characterSets as any[]}
          />
        </Suspense>
      </section>

      <TVExpressButtons />
    </>
  );
}
