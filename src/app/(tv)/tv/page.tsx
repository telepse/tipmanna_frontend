import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getAllEventChannels } from "@/actions/events";
import { TVExpressButtons } from "@/components/tv/tv-express-buttons";
import TVFullscreen from "@/components/tv/tv-fullscreen";
import TVPageShell from "@/components/tv/tv-page-shell";
import { extractYoutubeID } from "@/lib/extractYoutubeID";

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

  const currentChannel = channels.find(
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
      <section className="p-8 sm:-ml-15">
        <TVPageShell
          channels={channels}
          characters={characters}
          characterSets={characterSets}
        />
      </section>

      <TVExpressButtons />
    </>
  );
}
