"use client";

import { Star } from "lucide-react";
import { useSelector } from "react-redux";

// Local imports
import { RootState } from "@/redux/store";

interface Props {
  iTipped: number;
}

export const EventRating = ({ iTipped }: Props) => {
  const is_logged_in = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  const is_visitor = user?.role === "VISITOR";

  const totalStars = 5;
  let filledStars = is_logged_in ? 1 : 0;

  const hasTipped = iTipped > 0;

  if (is_logged_in && hasTipped) {
    filledStars = 0;
  } else if (is_visitor) {
    filledStars = 0;
  } else {
    filledStars = 0;
  }

  return (
    <div className="flex justify-end">
      {[...Array(totalStars)].map((_, index) => (
        <Star
          key={index}
          className={`size-3.5 ${index < filledStars ? "fill-primary text-primary" : "text-gray-500"}`}
        />
      ))}
    </div>
  );
};
