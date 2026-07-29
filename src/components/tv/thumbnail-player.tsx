import { useEffect, useState } from "react";
import Image from "next/image";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";
import TvPlayer from "./tv-player";
import { Play } from "lucide-react";

interface Props {
  videoUrl: string;
  className?: string;
  /** Discover content row id; used with `suppressInlinePlaybackContentId`. */
  contentId?: string;
  /** When it matches `contentId`, inline preview is forced off (same clip opened in Explore reel). */
  suppressInlinePlaybackContentId?: string | null;
  disableInlinePlayback?: boolean;
}

export const ThumbnailPlayer = ({
  videoUrl,
  className,
  contentId,
  suppressInlinePlaybackContentId,
  disableInlinePlayback = false,
}: Props) => {
  const [play, setPlay] = useState(false);

  const suppressInline =
    Boolean(contentId) &&
    Boolean(suppressInlinePlaybackContentId) &&
    suppressInlinePlaybackContentId === contentId;

  useEffect(() => {
    if (suppressInline) setPlay(false);
  }, [suppressInline]);

  const videoId = extractYoutubeID(videoUrl);

  useYoutubeVideoAspect(videoUrl);

  if (!videoId) return <p>Invalid video link</p>;

  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const showPlayer = !disableInlinePlayback && play && !suppressInline;

  return (
    <div className={`relative ${className ?? ""}`}>
      {!showPlayer ? (
        <button
          type="button"
          className="relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
          onClick={e => {
            if (disableInlinePlayback) {
              // Parent card handles Explore handoff.
              return;
            }
            e.stopPropagation();
            setPlay(true);
          }}
          aria-label="Play video preview"
        >
          <span className="relative block aspect-video w-full overflow-hidden rounded-md p-2">
            <Image
              src={thumbnail}
              alt="Video thumbnail"
              width={80}
              height={50}
              className="aspect-video h-auto w-full rounded-md object-cover"
              unoptimized
            />
          </span>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/70 p-2">
              <Play className="size-6 text-white" />
            </div>
          </div>
        </button>
      ) : (
        <TvPlayer
          key="tv-player"
          videoUrl={videoUrl}
        />
      )}
    </div>
  );
};
