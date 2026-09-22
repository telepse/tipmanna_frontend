/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

// Third-party imports
import { Rocket, Plus, Search, Tv, UserRound } from "lucide-react";
import { NotificationBadge } from "@/components/notifications/notification-badge";

// Local imports
import { useCreateDialogHost } from "@/components/home/create-dialog-host";
import { ProfileDrawer } from "./profile-drawer";
import {
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import {
  expressNavigateToExplore,
  expressNavigateToTv,
} from "@/lib/express-surface-navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { useTvSurfaceMode } from "@/hooks/use-tv-surface-mode";

/** Portrait mobile TV chrome below navbar — keep in sync with tv-interactive-shell. */
export const TV_MOBILE_SHELL_TOP =
  "calc(env(safe-area-inset-top,0px) + 5rem)" as const;

export const TVExpressButtons = () => {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const { openCreate, closeCreate, isCreateOpen } = useCreateDialogHost();
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);

  const userRole = useSelector((s: RootState) => s.auth.user?.role);
  const isSignedIn =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    (userRole === "HOST" || userRole === "TIPPER");

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

  const isTVActive = isCreateOpen || isProfileDrawerOpen;

  const { mode: surfaceMode } = useTvSurfaceMode();

  if (surfaceMode === "phoneLandscape") return null;

  return (
    <div className="fixed top-10 right-0 left-0 z-[1000] flex w-full items-center justify-center border-t border-gray-200 bg-white px-0 py-1 sm:hidden">
      <div className="-mt-1 grid w-full grid-cols-4 border-b border-black/20 bg-white/80 px-2">
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-1 border border-black/20"
          onClick={() => expressNavigateToTv()}
        >
          <Tv
            className={`size-5 ${isTVActive ? "" : "text-primary"}`}
            strokeWidth={isTVActive ? 2 : 2}
          />{" "}
          <span className="text-[8px]">Watch TV</span>
        </button>

        <button
          type="button"
          onPointerEnter={prefetchExploreFeedInitial}
          onClick={() => {
            closeCreate();
            setIsProfileDrawerOpen(false);
            expressNavigateToExplore();
          }}
          className="flex flex-col items-center justify-center border border-black/20"
        >
          <Rocket
            className="size-5"
            strokeWidth={2}
          />{" "}
          <span className="text-[8px]">Explore</span>
        </button>

        <div className="flex flex-col items-center justify-center border border-black/20">
          <div className="flex items-center justify-center">
            <button
              type="button"
              className="rounded-full bg-black/20 p-[3px]"
              onClick={() => {
                setIsProfileDrawerOpen(false);
                openCreate();
              }}
            >
              <Plus
                className={`size-4 ${isCreateOpen ? "text-primary" : ""}`}
                strokeWidth={isCreateOpen ? 3.75 : 2}
              />
            </button>
          </div>{" "}
          <span className="text-[8px]">Create</span>
        </div>

        <button
          type="button"
          className="relative flex flex-col items-center justify-center border border-black/20"
          onClick={() => {
            closeCreate();
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
          <span className="max-w-[4.5rem] truncate text-[8px] text-black">
            {isSignedIn
              ? "Signed in"
              : userRole === "VISITOR"
                ? "Guest"
                : "Not signed in"}
          </span>
        </button>
      </div>

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
