import { Forward } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { formatDate } from "@/lib/utils";
import { EventRating } from "../events/event-rating";

interface EventSummaryCardProps {
  name: string;
  date: string;
  total: number;
  iTipped: number;
  // tipperAmount: number;
  // visitorAmount?: number;
}

export const EventSummaryCard = ({
  name,
  date,
  total,
  iTipped,
  // tipperAmount,
  // visitorAmount,
}: EventSummaryCardProps) => {
  return (
    <div className="flex justify-between py-4">
      <div className="flex gap-4">
        <div>
          <Paragraph
            size="sm"
            weight="bold"
          >
            {name}
          </Paragraph>
          <div className="flex gap-2">
            <Paragraph
              size="xs"
              color="muted"
            >
              {formatDate(date)}
            </Paragraph>
            <Paragraph
              size="xs"
              weight="bold"
              color="muted"
            >
              Total: &pound;{total || 0}
            </Paragraph>

            <EventRating
              iTipped={iTipped}
              // tipperAmount={tipperAmount}
              // visitorAmount={visitorAmount}
            />
          </div>
        </div>
      </div>

      <Button
        size="icon"
        className="!bg-primary/80 border border-white"
      >
        <Forward className="text-white/80" />
      </Button>
    </div>
  );
};
