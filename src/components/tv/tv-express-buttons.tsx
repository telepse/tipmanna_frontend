/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import { Plus, Search, Tv, UserRound } from "lucide-react";
import { NotificationBadge } from "@/components/notifications/notification-badge";

// Local imports
import { CreateDrawer } from "./create-drawer";
import { ProfileDrawer } from "./profile-drawer";
import {
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import Link from "next/link";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

export const TVExpressButtons = () => {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const router = useRouter();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [tipperEventsRes, iTippedRes, causesRes] = await Promise.all([
        userId
          ? getTippedEventsForTipper()
          : Promise.resolve({ success: true, data: [] as any[] }),
        userId
          ? getTotalAmountTippedByTipper()
          : Promise.resolve({ success: true, data: 0 }),
        getAllCausesAction(),
      ]);

      setTipperEvents(
        tipperEventsRes.success && Array.isArray(tipperEventsRes.data)
          ? tipperEventsRes.data
          : []
      );
      setITipped(typeof iTippedRes.data === "number" ? iTippedRes.data : 0);
      setCauses(
        causesRes.success && Array.isArray(causesRes.data) ? causesRes.data : []
      );
    };

    void fetchData();
  }, [userId]);

  const isTVActive = isCreateDrawerOpen || isProfileDrawerOpen;

  return (
    <div className="fixed top-10 right-0 left-0 z-[1000] flex w-full items-center justify-center border-t border-gray-200 bg-white px-0 py-2 sm:hidden">
      <div className="-mt-2 grid w-full grid-cols-4 border-b border-black/20 bg-white/80 px-2">
        <Link
          href="/tv"
          className="flex items-center justify-center border border-black/20"
        >
          <Tv
            className={`size-5 ${isTVActive ? "" : "text-primary"}`}
            strokeWidth={isTVActive ? 2 : 3.75}
          />
        </Link>

        <button
          type="button"
          onPointerEnter={prefetchExploreFeedInitial}
          onClick={() => {
            prefetchExploreFeedInitial();
            setIsCreateDrawerOpen(false);
            setIsProfileDrawerOpen(false);
            router.push("/explore");
          }}
          className="flex items-center justify-center border border-black/20"
        >
          <Search
            className="size-5"
            strokeWidth={2}
          />
        </button>

        <div className="flex items-center justify-center border border-black/20 p-1">
          <button
            type="button"
            className="rounded-full bg-black/20 p-1"
            onClick={() => {
              setIsProfileDrawerOpen(false);
              setIsCreateDrawerOpen(true);
            }}
          >
            <Plus
              className={`? "text-primary" : ""} size-4`}
              strokeWidth={isCreateDrawerOpen ? 3.75 : 2}
            />
          </button>
        </div>

        <button
          type="button"
          className="relative flex items-center justify-center border border-black/20"
          onClick={() => {
            setIsCreateDrawerOpen(false);
            setIsProfileDrawerOpen(true);
          }}
        >
          <UserRound
            className={`size-5 ${isProfileDrawerOpen ? "text-primary" : ""}`}
            strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
          />
          <NotificationBadge
            variant="dot"
            className="-top-0.5 right-6"
          />
        </button>
      </div>

      <CreateDrawer
        isCreateDrawerOpen={isCreateDrawerOpen}
        setIsCreateDrawerOpen={setIsCreateDrawerOpen}
      />

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
