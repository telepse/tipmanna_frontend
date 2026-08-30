import { ChevronDown, ChevronUp } from "lucide-react";

// Local imports
import { Paragraph } from "../shared/paragraph";
import { formatDate } from "@/lib/utils";
import { EventRating } from "../events/event-rating";

interface ProfileEventCardProps {
  name: string;
  date: string;
  rating: number;
  price: number;
  isActive?: boolean;
  onSelect?: (event: {
    name: string;
    date: string;
    rating: number;
    price: number;
  }) => void;
}

export const ProfileEventCard = ({
  name,
  date,
  rating,
  price,
  isActive,
  onSelect,
}: ProfileEventCardProps) => {
  const handleSelect = () => {
    if (onSelect) onSelect({ name, date, rating, price });
  };

  return (
    <div
      onClick={handleSelect}
      className={`flex flex-wrap justify-between rounded-md border p-4 transition ${isActive ? "border-primary bg-secondary/20 border" : "border bg-white"}`}
    >
      <div className="flex gap-4">
        <div>
          <Paragraph
            size="sm"
            weight="bold"
          >
            {name}
          </Paragraph>
          <Paragraph
            size="xs"
            color="muted"
          >
            {formatDate(date)}
          </Paragraph>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <EventRating
          iTipped={price}
          // tipperAmount={price}
          // visitorAmount={price}
        />

        <span className="bg-primary inline-block size-fit rounded-md px-2 py-1 text-white">
          &pound;{price}
        </span>

        {isActive ? (
          <ChevronUp
            onClick={handleSelect}
            className="cursor-pointer"
          />
        ) : (
          <ChevronDown
            onClick={handleSelect}
            className="cursor-pointer"
          />
        )}
      </div>
    </div>
  );
};
