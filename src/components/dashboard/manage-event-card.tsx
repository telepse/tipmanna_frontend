"use client";

import { useRouter } from "next/navigation";

// Third-party imports
import { Clock, Eye, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";

// Local imports
import { formatDate } from "@/lib/formatDate";
import { RootState } from "@/redux/store";

interface Props {
  id: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  approved: boolean;
  amountRaised: number;
  numOfTips: number;
}

export function ManageEventCard({
  id,
  eventName,
  eventDate,
  startTime,
  endTime,
  approved,
  amountRaised,
  numOfTips,
}: Props) {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  let eventCode;
  if (user?.role === "HOST") {
    eventCode = user?.eventCode;
  }

  const handleEnterEvent = () => {
    router.push(`/room/${id}`);
  };

  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-md border p-6">
      <div className="space-y-2">
        <h5 className="text-xl font-semibold">{eventName}</h5>
        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          {formatDate(eventDate)} <Clock className="size-4" /> {startTime} -{" "}
          {endTime} &middot; Performers:{" "}
        </p>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <span className="text-primary">Tips raised:</span>{" "}
          <span className="text-primary font-semibold">
            &pound;{amountRaised || 0}
          </span>{" "}
          <span>Event code: {eventCode}</span>
        </p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span>Tippers engaged:</span>{" "}
          <span className="font-semibold">{numOfTips || 0}</span>{" "}
          <Star className="text-primary fill-primary size-4" />{" "}
          <span>Avg rating:</span>5{" "}
          <span>
            {approved ? (
              <span className="rounded-md bg-green-600 px-2 py-1 text-sm text-white">
                Approved
              </span>
            ) : (
              <span className="text-primary bg-primary/20 rounded-md px-2 py-1 text-sm">
                Pending
              </span>
            )}
          </span>
        </p>
      </div>

      <div className="flex flex-col items-start gap-1 md:items-end">
        <Button
          onClick={handleEnterEvent}
          disabled={!approved}
          className="bg-secondary/20 text-black"
        >
          <Eye /> View event room
        </Button>
        <Button
          disabled={!approved}
          className="bg-secondary/20 w-fit text-black"
        >
          <Share2 /> Share
        </Button>
      </div>
    </div>
  );
}
