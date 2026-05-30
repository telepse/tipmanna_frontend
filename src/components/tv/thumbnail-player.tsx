import { useEffect, useState } from "react";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";
import TvPlayer from "./tv-player";

interface Props {
  videoUrl: string;
  className?: string;
  /** Discover content row id; used with `suppressInlinePlaybackContentId`. */
  contentId?: string;
  /** When it matches `contentId`, inline preview is forced off (same clip opened in Explore reel). */
  suppressInlinePlaybackContentId?: string | null;
}

export const ThumbnailPlayer = ({
  videoUrl,
  className,
  contentId,
  suppressInlinePlaybackContentId,
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
  const showPlayer = play && !suppressInline;

  return (
    <div className={`relative w-full ${className}`}>
      {!showPlayer ? (
        <button
          type="button"
          className="relative w-full cursor-pointer border-0 bg-transparent p-0 text-left"
          onClick={() => setPlay(true)}
          aria-label="Play video preview"
        >
          <img
            src={thumbnail}
            alt="video thumbnail"
            className="h-[170px] w-[270px] object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-3">
              <svg
                className="h-8 w-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
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
