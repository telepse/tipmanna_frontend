import { useRef, useState } from "react";
import Image from "next/image";

// Third-party imports
import {
  Bookmark,
  Eye,
  MessageCircleMore,
  Play,
  Share2,
  Users,
} from "lucide-react";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { cn, formatWithCommas } from "@/lib/utils";
import Link from "next/link";
import VideoPlayer, { VideoPlayerRef } from "../events/video-player";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface Props {
  channelId: string;
  roomId: string;
  eventBanner: string;
  /** Main headline (e.g. video/channel title on explore; event name only if no video title). */
  eventName: string;
  /** Optional second line — e.g. parent event / room name when `eventName` is the video title. */
  eventSubtitle?: string;
  fullName?: string | null;
  username?: string | null;
  amountRaised?: number | null;
  numOfTips?: number | null;
  numOfEncounters?: number;
  startTime: string;
  endTime: string;
  duration: number;
  numOfSaves?: number | null;
  numOfShares?: number | null;
  numOfComments?: number | null;
  videoUrl: string;
  videoId: string;
  /** When set, play button opens overlay instead of navigating to content client. */
  onPlayClick?: () => void;
}

export const FeaturedContentCard = ({
  channelId,
  roomId,
  eventBanner,
  eventName,
  eventSubtitle,
  fullName,
  username,
  amountRaised,
  numOfTips,
  numOfEncounters = 0,
  duration,
  numOfSaves,
  numOfShares,
  numOfComments,
  videoUrl,
  videoId,
  onPlayClick,
}: Props) => {
  const [loadingEventId] = useState<string | null>(null);
  const headline =
    eventName.trim() || eventSubtitle?.trim() || "Untitled video";
  const altText = [headline, eventSubtitle].filter(Boolean).join(" — ");

  const videoRef = useRef<VideoPlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div
      className="rounded-2xl border"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <div className="relative">
        <Image
          src={eventBanner}
          alt={altText}
          width={340}
          height={180}
          className="h-[180px] w-[340px] rounded-t-2xl object-contain sm:object-cover"
        />

        <span className="absolute right-2 bottom-2 flex gap-2 rounded-md bg-white px-2 py-1 text-xs">
          Duration: {formatTime(duration)}
        </span>

        {onPlayClick ? (
          <button
            type="button"
            aria-label={`Play ${headline}`}
            onClick={onPlayClick}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative rounded-full bg-black p-2">
              <Play className="z-50 flex size-8 flex-col items-center justify-center rounded-full text-white" />
            </div>
          </button>
        ) : (
          <Link
            href={`/content/${channelId}?v=${videoId}`}
            target="_blank"
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative rounded-full bg-black p-2">
              <div
                className={`absolute inset-0 flex size-12 cursor-pointer items-center justify-center rounded-full ${loadingEventId === channelId ? "animate-spin border-4 border-white border-r-transparent" : ""} p-2 transition-all duration-300 ease-in-out`}
              />
              <Play className="z-50 flex size-8 flex-col items-center justify-center rounded-full text-white" />
            </div>
          </Link>
        )}
      </div>

      <div className="bg-secondary/30 space-y-2 px-2 py-4">
        <Paragraph
          size="lg"
          weight="bold"
        >
          {headline.substring(0, 20)}
          {headline.length > 20 ? "..." : ""}
        </Paragraph>

        <div
          className={`${fullName && username ? "mt-6" : "mt-0"} flex justify-between`}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {numOfTips ? (
                <span className="flex items-center gap-0.5 text-sm whitespace-nowrap">
                  {numOfTips && <Users className="size-4" />}
                  {numOfTips} {numOfTips && "tips"}
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-sm">
                  <Users className="size-4" /> 0 tips
                </span>
              )}
              {numOfEncounters && (
                <span className="flex items-center gap-0.5 text-sm whitespace-nowrap">
                  <Eye className="size-4" /> {numOfEncounters} seen
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {numOfSaves && (
                <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                  <Bookmark className="size-3" /> {numOfSaves} saves
                </span>
              )}
              {numOfShares ? (
                <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                  {numOfShares && <Share2 className="size-3" />}
                  {numOfShares} {numOfShares && "comments"}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                  0 comments
                </span>
              )}
              {numOfComments ? (
                <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                  {numOfComments && <MessageCircleMore className="size-3" />}
                  {numOfComments} {numOfComments && "comments"}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                  0 comments
                </span>
              )}
            </div>
          </div>

          {amountRaised && (
            <span className="text-primary border-primary flex items-center gap-2 rounded-md border px-2 py-1">
              <Image
                src="/icons/diamond.png"
                alt="Diamond"
                width={40}
                height={40}
                className="size-5 sm:size-7"
              />{" "}
              &pound;
              {formatWithCommas(amountRaised)}
            </span>
          )}

          {/* <VideoPlayer
              ref={videoRef}
              videoUrl={videoUrl}
              key={channelId}
              className="pointer-events-none h-full w-full"
              fullPresentationFit={fullPresentationFit}
              isChannel={true}
              onPlayStateChange={setIsPlaying}
              onMuteStateChange={setIsMuted}
              onPlaybackEnded={() => {
                if (!channelId) return;
                const ch = String(channelId);
                if (playbackSeekedForCompleteRef.current) return;
                trackTvVideoComplete(ch, { channelId: ch, mode: "LOCAL" });
              }}
              onVideoLoaded={emitEncounterOnVideoLoaded}
            /> */}
        </div>
      </div>
    </div>
  );
};
