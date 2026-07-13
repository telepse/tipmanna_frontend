import { getCharactersForTipping } from "@/actions/characters";
import { getEventChannelByYoutubeVideoId } from "@/actions/events";
import TVFullscreen from "@/components/tv/tv-fullscreen";
import TVPageShell from "@/components/tv/tv-page-shell";
import { TvPageSuspenseFallback } from "@/components/tv/tv-page-suspense-fallback";
import { Metadata } from "next";
import { Suspense } from "react";
import { getPrimaryOrigin } from "@/lib/site-config";
import { isTvLazySsrCharactersEnabled } from "@/lib/tv-feature-flags";

type EventChannelListItem = {
  url?: string;
  title?: string;
  event: { eventBackground: string };
};

interface Props {
  searchParams: Promise<{ videoId?: string }>;
}

async function loadChannelForVideoId(videoId: string | undefined) {
  if (!videoId?.trim()) return null;
  const { data } = await getEventChannelByYoutubeVideoId(videoId);
  return (data ?? null) as EventChannelListItem | null;
}

/**
 * GENERATE METADATA
 * Handles SEO and Social Media tags for LinkedIn, Twitter, etc.
 */
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { videoId } = await searchParams;
  const currentChannel = await loadChannelForVideoId(videoId);

  if (!currentChannel) return { title: "Tipmanna TV" };

  const imageUrl = currentChannel.event.eventBackground;

  const description = `Tune into ${currentChannel.title}'s always-on TV channel featuring scheduled programs, community engagement, and realtime supporter participation.`;

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title: `Watch ${currentChannel.title} TV — Streaming 24/7 📺`,
    description: description,
    openGraph: {
      title: `Watch ${currentChannel.title} TV — Streaming 24/7 📺`,
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
      title: `Watch ${currentChannel.title} TV — Streaming 24/7 📺`,
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
  const lazySsrCharacters = isTvLazySsrCharactersEnabled();

  const [{ data: characters }, currentChannel] = await Promise.all([
    lazySsrCharacters
      ? Promise.resolve({
          data: [] as Awaited<
            ReturnType<typeof getCharactersForTipping>
          >["data"],
        })
      : getCharactersForTipping(),
    loadChannelForVideoId(videoId),
  ]);

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
        <Suspense fallback={<TvPageSuspenseFallback />}>
          <TVPageShell characters={characters ?? []} />
        </Suspense>
      </section>
    </>
  );
}
