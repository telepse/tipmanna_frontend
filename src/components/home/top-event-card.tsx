import Image from "next/image";

// Third-party imports
import { Users } from "lucide-react";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import {
  formatDate,
  getEventStatus,
  getStatusColor,
  getEventDuration,
  formatWithCommas,
} from "@/lib/utils";
import Link from "next/link";

interface Props {
  channelId: string;
  roomId: string;
  eventBanner: string;
  eventName: string;
  organizationName: string;
  amountRaised: number;
  numOfTips: number;
  eventDate: string;
  startTime: string;
  endTime: string;
}

export const TopEventCard = ({
  roomId,
  eventBanner,
  eventName,
  organizationName,
  amountRaised,
  numOfTips,
  eventDate,
  startTime,
  endTime,
}: Props) => {
  const status = getEventStatus(eventDate, startTime, endTime);
  const statusColor = getStatusColor(status);

  return (
    <div
      className="rounded-2xl border"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <Link
        href={`/room/${roomId}`}
        prefetch={true}
        className="relative"
      >
        <Image
          src={eventBanner}
          alt={eventName}
          width={320}
          height={180}
          className="h-[180px] w-[320px] rounded-t-2xl object-contain sm:object-cover"
        />

        {/* Play button overlay */}
        {/* <button
          type="button"
          className="absolute inset-0 flex items-center justify-center"
          onClick={() => goToRoom(roomId)}
        >
          <div className="relative rounded-full bg-black p-2">
            <div
              className={`absolute inset-0 flex size-12 cursor-pointer items-center justify-center rounded-full ${loadingEventId === channelId ? "animate-spin border-4 border-white border-r-transparent" : ""} p-2 transition-all duration-300 ease-in-out`}
            />
            <Play className="z-50 flex size-8 flex-col items-center justify-center rounded-full text-white" />
          </div>
        </button> */}

        <span
          className={`absolute top-4 left-4 w-fit rounded-md px-2 py-1 text-sm ${statusColor}`}
        >
          {status}
        </span>
      </Link>

      <Link
        href={`/room/${roomId}`}
        prefetch={true}
        className="block space-y-2 p-4"
      >
        <Paragraph
          size="lg"
          weight="bold"
        >
          {eventName.substring(0, 20)}
          {eventName.length > 20 ? "..." : ""}
        </Paragraph>
        <Paragraph
          size="sm"
          className="-mt-4 flex items-center justify-between gap-2"
        >
          <span className="text-sm">
            By: {organizationName.substring(0, 20)}
            {eventName.length > 20 ? "..." : ""}{" "}
          </span>
          <span className="text-muted-foreground flex gap-2 text-sm">
            <Users className="size-4" /> {numOfTips} Tips
          </span>
        </Paragraph>

        <div className="mt-6 flex justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground flex gap-2 text-sm">
              {getEventDuration(startTime, endTime)}
            </span>

            <span className="text-muted-foreground flex items-center gap-2 text-sm">
              {formatDate(eventDate)}
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
      </Link>
    </div>
  );
};
