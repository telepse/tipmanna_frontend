import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Third-party imports
import { Play, Users } from "lucide-react";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { formatDate, formatWithCommas } from "@/lib/utils";
import Link from "next/link";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface Props {
  channelId: string;
  roomId: string;
  eventBanner: string;
  eventName: string;
  fullName: string;
  username: string;
  amountRaised: number;
  numOfTips: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export const TopContentCard = ({
  channelId,
  roomId,
  eventBanner,
  eventName,
  fullName,
  username,
  amountRaised,
  numOfTips,
  eventDate,
  startTime,
  endTime,
  duration,
}: Props) => {
  const [loadingEventId] = useState<string | null>(null);
  const router = useRouter();

  // const handleEnterEvent = (eventId: string) => {
  //   const token = Date.now().toString();
  //   sessionStorage.setItem(`event-token-${eventId}`, token);

  //   setLoadingEventId(eventId);
  //   router.push(`/room/${eventId}?token=${token}&autoOpenLive=true`);
  // };

  const goToChannel = (channelId: string) => {
    router.push(`/room/${roomId}?frame=${channelId}`);
  };

  return (
    <div
      className="rounded-2xl border"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <div className="relative">
        <Image
          src={eventBanner}
          alt={eventName}
          width={320}
          height={180}
          className="h-[180px] w-[320px] rounded-t-2xl object-contain sm:object-cover"
        />

        <Link
          href={`/room/${roomId}?frame=${channelId}`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="relative rounded-full bg-black p-2">
            <div
              className={`absolute inset-0 flex size-12 cursor-pointer items-center justify-center rounded-full ${loadingEventId === channelId ? "animate-spin border-4 border-white border-r-transparent" : ""} p-2 transition-all duration-300 ease-in-out`}
            />
            <Play className="z-50 flex size-8 flex-col items-center justify-center rounded-full text-white" />
          </div>
        </Link>
      </div>

      <div className="space-y-2 p-4">
        <Paragraph
          size="lg"
          weight="bold"
        >
          {eventName.substring(0, 20)}
          {eventName.length > 20 ? "..." : ""}
        </Paragraph>
        <Paragraph
          size="sm"
          className="-mt-3 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-1 text-xs whitespace-nowrap">
            Host: {fullName.split(" ")[0]}{" "}
            <span className="text-primary">
              @{username.substring(0, 9)}
              {username.length > 7 ? "..." : ""}
            </span>
          </span>
          <span className="text-muted-foreground flex gap-1 text-xs whitespace-nowrap">
            <Users className="size-4" /> {numOfTips} Tips
          </span>
        </Paragraph>

        <div className="mt-6 flex justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex gap-2 text-xs">
              Duration: {formatTime(duration)}
            </span>

            <span className="text-muted-foreground flex items-center gap-2 text-xs">
              Created: {formatDate(eventDate)}
            </span>
          </div>

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
        </div>
      </div>
    </div>
  );
};
