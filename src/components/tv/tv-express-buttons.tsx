/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

// Third-party imports
import { Plus, Search, Tv, UserRound } from "lucide-react";

// Local imports
import { ExploreDrawer } from "./explore-drawer";
import { CreateDrawer } from "./create-drawer";
import { ProfileDrawer } from "./profile-drawer";
import { getClientTokenFromPersist } from "@/lib/getClientToken";
import { getLatestContents, getMostTippedContents } from "@/actions/contents";
import {
  getAllTopTippers,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";

export const TVExpressButtons = () => {
  const [isExploreDrawerOpen, setIsExploreDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  // Data states
  const [contents, setContents] = useState<any[]>([]);
  const [latestContents, setLatestContents] = useState<any[]>([]);
  const [mostTippedContents, setMostTippedContents] = useState<any[]>([]);
  const [tippers, setTippers] = useState<any[]>([]);
  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = getClientTokenFromPersist();

      const [
        latestContentsRes,
        mostTippedContentsRes,
        tippersRes,
        tipperEventsRes,
        iTippedRes,
        causesRes,
      ] = await Promise.all([
        getLatestContents(),
        getMostTippedContents(),
        getAllTopTippers(),
        getTippedEventsForTipper(token!),
        getTotalAmountTippedByTipper(token!),
        getAllCausesAction(),
      ]);

      setLatestContents(latestContentsRes.data);
      setMostTippedContents(mostTippedContentsRes.data);
      setTippers(tippersRes.data);
      setTipperEvents(tipperEventsRes.data);
      setITipped(iTippedRes.data);
      setCauses(causesRes.data);
    };

    fetchData();
  }, []);

  const isTVActive =
    isExploreDrawerOpen || isCreateDrawerOpen || isProfileDrawerOpen;

  return (
    <div className="fixed bottom-0 z-[1000] w-full sm:hidden">
      <div className="-mt-1 flex w-full items-center justify-between gap-2 border-t border-black/20 bg-white/80 px-8 py-2">
        <button type="button">
          <Tv
            className={`size-7 ${isTVActive ? "" : "text-primary"}`}
            strokeWidth={isTVActive ? 2 : 3.75}
          />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsCreateDrawerOpen(false);
            setIsProfileDrawerOpen(false);
            setIsExploreDrawerOpen(true);
          }}
        >
          <Search
            className={`size-7 ${isExploreDrawerOpen ? "text-primary" : ""}`}
            strokeWidth={isExploreDrawerOpen ? 3.75 : 2}
          />
        </button>

        <button
          type="button"
          className="rounded-full bg-black/20 p-1"
          onClick={() => {
            setIsExploreDrawerOpen(false);
            setIsProfileDrawerOpen(false);
            setIsCreateDrawerOpen(true);
          }}
        >
          <Plus
            className={`size-7 ${isCreateDrawerOpen ? "text-primary" : ""}`}
            strokeWidth={isCreateDrawerOpen ? 3.75 : 2}
          />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsExploreDrawerOpen(false);
            setIsCreateDrawerOpen(false);
            setIsProfileDrawerOpen(true);
          }}
        >
          <UserRound
            className={`size-7 ${isProfileDrawerOpen ? "text-primary" : ""}`}
            strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
          />
        </button>
      </div>

      {/* EXPLORE SWIPER */}
      <ExploreDrawer
        isExploreDrawerOpen={isExploreDrawerOpen}
        setIsExploreDrawerOpen={setIsExploreDrawerOpen}
        contents={contents}
        latestContents={latestContents}
        mostTippedContents={mostTippedContents}
        tippers={tippers}
        setIsProfileDrawerOpen={setIsProfileDrawerOpen}
      />

      {/* CREATE DRAWER */}
      <CreateDrawer
        isCreateDrawerOpen={isCreateDrawerOpen}
        setIsCreateDrawerOpen={setIsCreateDrawerOpen}
      />

      {/* PROFILE DRAWER */}
      <ProfileDrawer
        isProfileDrawerOpen={isProfileDrawerOpen}
        setIsProfileDrawerOpen={setIsProfileDrawerOpen}
        tipperEvents={tipperEvents}
        iTipped={iTipped}
        causes={causes}
      />
    </div>
  );
};
