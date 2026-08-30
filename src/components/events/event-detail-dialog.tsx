import Image from "next/image";

// Third-party imports
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  eventBanner: string;
  eventName: string;
  eventDescription: string;
  venueName: string;
  venueLocation: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  activities: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatEventDateTime(
  eventDate: string,
  startTime: string,
  endTime: string
): string {
  const date = new Date(eventDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formatTime = (time: string) => {
    const [hoursString, minutesString = "00"] = time.split(":");

    const hours = Number(hoursString);
    const minutes = Number(minutesString);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return "";
    }

    const period = hours >= 12 && hours < 24 ? "PM" : "AM";

    const hour12 = hours % 12 || 12;

    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
  };

  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  return `${formattedDate} | ${formattedStartTime} - ${formattedEndTime}`;
}

export const EventDetailDialog = ({
  eventBanner,
  eventName,
  eventDescription,
  venueName,
  venueLocation,
  eventDate,
  startTime,
  endTime,
  activities,
  open,
  onOpenChange,
}: Props) => {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <Image
          src={eventBanner}
          alt={eventName}
          width={400}
          height={320}
          className="w-full object-cover"
        />

        {eventName?.trim() ? (
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground tracking-wide uppercase">
              Event name
            </p>
            <p className="leading-relaxed">{eventName}</p>
          </div>
        ) : null}

        {eventDescription?.trim() ? (
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground tracking-wide uppercase">
              Description
            </p>
            <p className="leading-relaxed">{eventDescription}</p>
          </div>
        ) : null}

        {venueName?.trim() ? (
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground tracking-wide uppercase">
              Venue name
            </p>
            <p className="font-medium">{venueName}</p>
          </div>
        ) : null}

        {venueLocation?.trim() ? (
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground tracking-wide uppercase">
              Location
            </p>
            <p className="font-medium">{venueLocation}</p>
          </div>
        ) : null}

        {eventDate ? (
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground tracking-wide uppercase">
              Event date
            </p>
            <p className="font-medium">
              {formatEventDateTime(eventDate, startTime, endTime)}
            </p>
          </div>
        ) : null}

        {startTime?.trim() || endTime?.trim() ? (
          <div className="grid grid-cols-2 gap-4">
            {startTime?.trim() ? (
              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground tracking-wide uppercase">
                  Start time
                </p>
                <p className="font-medium">{startTime}</p>
              </div>
            ) : null}
            {endTime?.trim() ? (
              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground tracking-wide uppercase">
                  End time
                </p>
                <p className="font-medium">{endTime}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {Array.isArray(activities) && activities.length > 0 ? (
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground tracking-wide uppercase">
              Activities
            </p>
            <p className="font-medium">
              {activities
                .map(activity =>
                  String(activity).replace(/_/g, " ").toLowerCase()
                )
                .join(", ")}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
