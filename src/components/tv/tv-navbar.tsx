/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";

// THird-party imports
import { Input } from "@/components/ui/input";
import { Menu, Search, UserRound } from "lucide-react";

// Local imports
import { useEffect, useState } from "react";
import { CreateDialog } from "../home/create-dialog";
import { useTvSourcePicker } from "./tv-source-picker-provider";
import { TvSourceDropdown } from "./tv-source-dropdown";
import { useRouter } from "next/navigation";
import { useTvSurfaceMode } from "@/hooks/use-tv-surface-mode";
import { NotificationBadge } from "../notifications/notification-badge";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { ProfileDrawer } from "./profile-drawer";
import {
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";

interface Props {
  active_users: number;
}

function TvNavbarSourceDropdown() {
  const {
    showSourceDropdown,
    tvPickerOptions,
    scheduleSourceCommunityId,
    onTvSourceChange,
  } = useTvSourcePicker();

  if (!showSourceDropdown) return null;

  return (
    <TvSourceDropdown
      communityId={scheduleSourceCommunityId}
      options={tvPickerOptions}
      onChange={onTvSourceChange}
    />
  );
}

export const TVNavbar = ({ active_users }: Props) => {
  const [openPopup, setOpenPopup] = useState(false);
  const router = useRouter();

  const handleExplore = () => {
    router.push("/explore?feedTab=trends&tab=discover");
  };

  const { mode: surfaceMode } = useTvSurfaceMode();

  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const userRole = useSelector((s: RootState) => s.auth.user?.role);
  const isSignedIn =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    (userRole === "HOST" || userRole === "TIPPER");

  const userId = useSelector((s: RootState) => s.auth.user?.id);

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

  if (surfaceMode === "phoneLandscape") return null;

  return (
    <div className="relative">
      <div className="fixed top-0 right-0 left-0 z-10 flex w-full items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-2 sm:py-4">
        {/* Menu icon and logo */}
        <div className="flex items-center gap-2">
          <Menu className="hidden lg:block" />
          <Link
            href="/partner"
            className="racing_sans_one -mt-2 text-sm sm:mt-0 sm:text-2xl"
          >
            tip<span className="text-primary">manna</span>
          </Link>
        </div>

        {/* Explore contents */}
        <div
          className="bg-gray hidden w-96 items-center gap-2 lg:flex"
          role="button"
          onClick={handleExplore}
        >
          <Input
            className="bg-gray h-8 rounded-md border-none text-sm focus:outline-none"
            placeholder="Explore contents"
          />

          <Search />
        </div>

        {/* Live TV, create, notification, profile */}
        <div className="hidden items-center gap-4 lg:flex">
          <TvNavbarSourceDropdown />

          <div className="flex items-center gap-2">
            <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4" />
            <span className="text-sm font-medium">
              {active_users || 0} online
            </span>
          </div>

          <Link
            href="/explore"
            className="text-sm"
          >
            TV Explore
          </Link>
          <span
            className="cursor-pointer text-sm"
            onClick={() => setOpenPopup(true)}
          >
            Create
          </span>
          {/* <Bell className="size-5" /> */}

          <button
            type="button"
            className="relative flex flex-col items-center justify-center"
            onClick={() => {
              setOpenPopup(false);
              setIsProfileDrawerOpen(true);
            }}
          >
            <UserRound
              className={`size-5 ${isProfileDrawerOpen ? "text-primary" : ""}`}
              strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
            />
            <NotificationBadge
              variant="dot"
              className="-top-0.5 left-6"
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

        <div className="inline-block lg:hidden">
          <TvNavbarSourceDropdown />
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <span className="bg-moonstone-blue -mt-2 size-[14px] rounded-full sm:size-4"></span>{" "}
          <span className="-mt-2 text-xs font-medium sm:text-sm">
            {active_users || 0} online
          </span>
        </div>

        <CreateDialog
          openPopup={openPopup}
          setOpenPopup={setOpenPopup}
        />

        <ProfileDrawer
          isProfileDrawerOpen={isProfileDrawerOpen}
          setIsProfileDrawerOpen={setIsProfileDrawerOpen}
          tipperEvents={tipperEvents}
          iTipped={iTipped}
          causes={causes}
        />
      </div>
    </div>
  );
};
