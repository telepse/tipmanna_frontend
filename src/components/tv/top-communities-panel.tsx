/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef } from "react";

// Third-party imports
import { ChevronRight, UsersRound } from "lucide-react";

// Local imports
import { Community } from "@/types/community.types";

type Props = {
  communities: any[];
};

export const TopCommunitiesPanel = ({ communities }: Props) => {
  const topCommunitiesRef = useRef<HTMLDivElement>(null);

  const scrollNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4">
      <h5 className="font-semibold">Top Communities</h5>

      <div className="relative">
        <div
          ref={topCommunitiesRef}
          className="hide__scrollbar scrollbar-none overflow-x-auto"
        >
          <div className="flex gap-6">
            {communities.map(community => (
              <div
                key={community.id}
                className="flex w-[150px] flex-col items-center space-y-2 rounded-lg border p-3"
              >
                <UsersRound />

                <div className="space-y-1">
                  <p className="text-xs">{community.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {community.memberCount} members &middot;{" "}
                    {community.totalTips} tips
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollNext(topCommunitiesRef)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
