import { Clock } from "lucide-react";

// Local imports
import { formatDate, getEventDuration, truncateText } from "@/lib/utils";
import { EventStatus } from "../shared/event-status";

interface Props {
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  amountToRaise: number;
}

export const RecentEventCard = ({
  eventName,
  eventDate,
  startTime,
  endTime,
  amountToRaise,
}: Props) => {
  const duration = getEventDuration(startTime, endTime);

  return (
    <div className="bg-card relative rounded-md border p-4 text-sm">
      <div className="space-y-1 text-sm">
        <h6 className="font-medium">{truncateText(eventName)}</h6>
        <p className="text-muted-foreground flex items-center gap-2">
          <span className="font-medium">{formatDate(eventDate)}</span>{" "}
          <Clock className="size-4" /> {startTime} - {endTime} ({duration})
        </p>
        <p className="text-muted-foreground">Performers: </p>
        <p>
          <span className="text-muted-foreground">Amount to raise:</span>{" "}
          <span className="font-semibold">&pound;{amountToRaise}</span>
        </p>
      </div>

      <div className="absolute top-4 right-4">
        <EventStatus
          eventDate={eventDate}
          startTime={startTime}
          endTime={endTime}
        />
      </div>
    </div>
  );
};
