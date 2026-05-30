import { Calendar, Users } from "lucide-react";

// Local imports
import { formatDate } from "@/lib/formatDate";

interface Props {
  eventName: string;
  eventDate: string;
  numOfTips: number;
  amountRaised: number;
}

export const RecentEventCard = ({
  eventName,
  eventDate,
  numOfTips,
  amountRaised,
}: Props) => {
  return (
    <div className="flex items-end justify-between rounded-xl border p-6 shadow-sm">
      <div className="space-y-2">
        <h5 className="font-medium">{eventName}</h5>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="size-4" /> {formatDate(eventDate)}
        </p>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Users className="size-4" /> {numOfTips} Tips
        </p>
      </div>

      <p className="text-primary text-sm font-medium">
        &pound;
        {amountRaised}
      </p>
    </div>
  );
};
