"use client";

import Link from "next/link";

// THird-party imports
import { Input } from "@/components/ui/input";
import { Bell, CircleUserRound, Menu, Search, XIcon } from "lucide-react";

// Local imports
import { useState } from "react";
import { CreateDialog } from "../home/create-dialog";
import { useTvSourcePicker } from "./tv-source-picker-provider";
import { TvSourceDropdown } from "./tv-source-dropdown";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "react-responsive";

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

  const isMobileLandscape =
    useMediaQuery({ query: "(orientation: landscape)" }) &&
    window.innerWidth <= 768;

  return (
    <div className="relative">
      {isMobileLandscape ? (
        <div className="bg-black">
          <XIcon className="absolute top-4 right-4 z-50 text-white" />
        </div>
      ) : (
        <div className="fixed top-0 right-0 left-0 z-10 flex w-full items-center justify-between gap-4 border-b border-gray-200 bg-white p-4">
          {/* Menu icon and logo */}
          <div className="flex items-center gap-2">
            <Menu className="hidden lg:block" />
            <Link
              href="/partner"
              className="racing_sans_one text-sm sm:text-2xl"
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
            <span className="text-sm">Create</span>
            <Bell className="size-5" />
            <CircleUserRound className="size-5" />
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
        </div>
      )}
    </div>
  );
};
