"use client";

import { useRouter } from "next/navigation";

// Third-party imports
import { Trophy, UserRound } from "lucide-react";
import { useSelector } from "react-redux";

// Local imports
import { RootState } from "@/redux/store";

interface Props {
  id: string;
  position: number;
  username: string;
  contributedAmount: number;
  eventsSupported: number;
}

export const TopTipperCard = ({
  id,
  position,
  username,
  contributedAmount,
  eventsSupported,
}: Props) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  let eventSlug;
  if (user?.role === "HOST") {
    eventSlug = user?.eventSlug;
  }

  // Badge unlock conditions
  const localUnlocked = eventsSupported >= 1;
  const countyUnlocked = eventsSupported >= 10;

  return (
    <div
      className="bg-card hover:bg-secondary/10 flex cursor-pointer flex-wrap justify-between gap-2 rounded-md border p-4 hover:transition-all hover:duration-300 sm:gap-4 sm:px-6 sm:py-8"
      onClick={() => router.push(`/host/${eventSlug!}/top-tippers/${id}`)}
    >
      <div className="flex items-center gap-4">
        <h5 className="text-xl font-medium sm:text-2xl">#{position}</h5>

        <div className="rounded-full border bg-white p-2">
          <UserRound className="text-primary size-7 font-semibold sm:size-10" />
        </div>

        <div className="space-y-2">
          <h6 className="text-xl font-medium">{username}</h6>

          {/* Badges unlocked */}
          <div className="flex gap-2">
            <span
              className={`bg-primary flex items-center gap-1 rounded-md px-4 py-1 text-sm font-medium text-white ${
                localUnlocked ? "opacity-100" : "opacity-50"
              }`}
            >
              <Trophy className="size-4" /> Local
            </span>
            <span
              className={`bg-primary flex items-center gap-1 rounded-md px-4 py-1 text-sm font-medium text-white ${
                countyUnlocked ? "opacity-100" : "opacity-50"
              }`}
            >
              <Trophy className="size-4" /> County
            </span>
          </div>
        </div>
      </div>

      {/* Contributed amount and events supported */}
      <div className="flex gap-4">
        <div className="space-y-1">
          <h6 className="text-primary font-semibold">
            &pound;{contributedAmount}
          </h6>
          <p className="text-muted-foreground text-sm">Total Contribution</p>
        </div>

        <div className="space-y-1">
          <h6 className="font-semibold">{eventsSupported}</h6>
          <p className="text-muted-foreground text-sm">Events Supported</p>
        </div>
      </div>
    </div>
  );
};
