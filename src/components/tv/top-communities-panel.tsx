"use client";

import { useEffect, useRef, useState } from "react";

// Third-party imports
import { ChevronRight } from "lucide-react";

// Local imports
import { getCommunityExploreCatalogAction } from "@/actions/communities";
import { Community } from "@/types/community.types";

export const TopCommunitiesPanel = () => {
  const topCommunitiesRef = useRef<HTMLDivElement>(null);
  const [topCommunities, setTopCommunities] = useState<Community[]>([]);

  useEffect(() => {
    const fetchTopCommunities = async () => {
      const res = await getCommunityExploreCatalogAction();
    //   setTopCommunities(res.data.topByTips as Community[]);
    };
    void fetchTopCommunities();
  }, []);

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
          className="scrollbar-none overflow-x-auto"
        >
          <div className="flex gap-6">
            {topCommunities.map((community: Community) => (
              <div
                key={community.id}
                role="button"
                tabIndex={0}
                // onClick={() => navigateToExplore(content)}
                // onKeyDown={e => {
                //   if (e.key === "Enter" || e.key === " ") {
                //     e.preventDefault();
                //     navigateToExplore(content);
                //   }
                // }}
                className="relative flex min-w-[270px] cursor-pointer gap-1 border-2 bg-black/10"
              >
                <div className="space-y-1"></div>
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
