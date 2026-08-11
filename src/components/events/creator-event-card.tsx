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

export const CreatorEventCard = ({
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
    <div className="bg-secondary/30 grid grid-cols-12 gap-2 sm:gap-4">
      <Link
        href={`/room/${roomId}`}
        prefetch={true}
        className="relative col-span-full block sm:col-span-4"
      >
        <Image
          src={eventBanner}
          alt={eventName}
          width={320}
          height={180}
          className="h-[180px] w-[320px] object-contain sm:w-full sm:object-cover"
        />

        <span
          className={`absolute top-4 left-4 w-fit rounded-md px-2 py-1 text-sm ${statusColor}`}
        >
          {status}
        </span>
      </Link>

      <Link
        href={`/room/${roomId}`}
        prefetch={true}
        className="col-span-full block space-y-2 px-4 py-4 sm:col-span-8 sm:px-0"
      >
        <Paragraph
          size="lg"
          weight="bold"
        >
          {eventName.substring(0, 30)}
          {eventName.length > 30 ? "..." : ""}
        </Paragraph>
        <Paragraph
          size="sm"
          className="flex items-center justify-between gap-2"
        >
          <span className="text-sm">
            By: {organizationName.substring(0, 20)}
            {organizationName.length > 20 ? "..." : ""}{" "}
          </span>
        </Paragraph>

        <div className="flex justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Users className="size-4" /> {numOfTips} Tips
              </span>
              &middot;
              <span className="text-muted-foreground text-sm">
                Amount raised:
              </span>
              <span className="text-primary border-primary flex items-center gap-1 rounded-md border px-1 py-0.5 text-sm">
                <Image
                  src="/icons/diamond.png"
                  alt="Diamond"
                  width={40}
                  height={40}
                  className="size-5"
                />{" "}
                &pound;
                {formatWithCommas(amountRaised)}
              </span>
            </div>

            <span className="text-muted-foreground flex gap-2 text-sm">
              Duration: {getEventDuration(startTime, endTime)}
            </span>

            <span className="text-muted-foreground flex items-center gap-2 text-sm">
              Event date: {formatDate(eventDate)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};
