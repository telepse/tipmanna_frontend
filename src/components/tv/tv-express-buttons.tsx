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
    <div className="fixed bottom-0 z-[1000] w-full sm:hidden">
      <div className="-mt-1 flex w-full items-center justify-between gap-2 border-t border-black/20 bg-white/80 px-8 py-4">
        <Link
          href="/tv"
          className="inline-flex"
        >
          <Tv
            className={`size-7 ${isTVActive ? "" : "text-primary"}`}
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
        >
          <Search
            className="size-7"
            strokeWidth={2}
          />
        </button>

        <button
          type="button"
          className="rounded-full bg-black/20 p-1"
          onClick={() => {
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
          className="relative"
          onClick={() => {
            setIsCreateDrawerOpen(false);
            setIsProfileDrawerOpen(true);
          }}
        >
          <UserRound
            className={`size-7 ${isProfileDrawerOpen ? "text-primary" : ""}`}
            strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
          />
          <NotificationBadge
            variant="dot"
            className="-top-0.5 -right-0.5"
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
