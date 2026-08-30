import { useState } from "react";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";
import TvPlayer from "../tv/tv-player";
// import TvPlayer from "./tv-player";

interface Props {
  videoUrl: string;
  className?: string;
}

export const PlaybackPreview = ({ videoUrl, className }: Props) => {
  const [play] = useState(false);
  const videoId = extractYoutubeID(videoUrl);

  useYoutubeVideoAspect(videoUrl);

  if (!videoId) return <p>Invalid video link</p>;

  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className={`relative w-full ${className}`}>
      {!play ? (
        <div className="relative cursor-pointer">
          <img
            src={thumbnail}
            alt="video thumbnail"
            className="h-[170px] w-full object-cover"
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
        </div>
      ) : (
        <TvPlayer
          key="tv-player"
          videoUrl={videoUrl}
        />
      )}
    </div>
  );
};
