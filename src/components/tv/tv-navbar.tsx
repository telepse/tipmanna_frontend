"use client";

import Link from "next/link";

// THird-party imports
import { Input } from "@/components/ui/input";
import {
  Bell,
  CircleUserRound,
  Menu,
  Search,
} from "lucide-react";
import {
  FacebookShareButton,
  FacebookIcon,
  TwitterShareButton,
  TwitterIcon,
  WhatsappShareButton,
  WhatsappIcon,
  LinkedinShareButton,
  LinkedinIcon,
} from "next-share";

// Local imports
import { useState } from "react";
import { CreateDialog } from "../home/create-dialog";
import { SITE_URL } from "@/lib/site-config";
import { useTvSourcePicker } from "./tv-source-picker-provider";
import { TvSourceDropdown } from "./tv-source-dropdown";

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
  const [showShare, setShowShare] = useState(false);

  const handleToggle = () => {
    console.log("showShare", showShare);
    setShowShare(prev => !prev);
  };

  const shareUrl = `${SITE_URL.replace(/\/$/, "")}/tv`;
  const shareTitle = "Join me on TipManna TV";

  const [openPopup, setOpenPopup] = useState(false);

  return (
    <div className="fixed top-0 right-0 left-0 z-10 flex w-full items-center justify-between border-b border-gray-200 bg-white p-4">
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
      <div className="bg-gray hidden w-96 items-center gap-2 lg:flex">
        <Input
          className="bg-gray h-8 rounded-md border-none text-sm focus:outline-none"
          placeholder="Explore contents"
        />

        <Search />
      </div>

      {/* Live TV, create, notification, profile */}
      <div className="hidden items-center gap-4 lg:flex">
        <TvNavbarSourceDropdown />
        <span className="text-sm">Live TV</span>
        <span className="text-sm">Create</span>
        <Bell className="size-5" />
        <CircleUserRound className="size-5" />
      </div>

      <div className="ml-auto flex items-center gap-2 lg:hidden">
        <TvNavbarSourceDropdown />
        <span className="bg-moonstone-blue -mt-2 size-[14px] rounded-full sm:size-4"></span>{" "}
        <span className="-mt-2 text-xs font-medium sm:text-sm">
          {active_users || 0} online
        </span>
        <div className="relative inline-block">
          <span
            className="-mt-2 block border-b-2 border-black text-xs sm:text-sm"
            onClick={handleToggle}
          >
            Share TV
          </span>

          {showShare && (
            <div className="absolute top-8 right-full z-[10000000000] mt-2 h-[50px] w-[150px] rounded-md border bg-white p-1 shadow-md">
              <WhatsappShareButton
                url={shareUrl}
                title={shareTitle}
              >
                <WhatsappIcon
                  size={32}
                  round
                />
              </WhatsappShareButton>
              <FacebookShareButton
                url={shareUrl}
                quote={shareTitle}
              >
                <FacebookIcon
                  size={32}
                  round
                />
              </FacebookShareButton>
              <TwitterShareButton
                url={shareUrl}
                title={shareTitle}
              >
                <TwitterIcon
                  size={32}
                  round
                />
              </TwitterShareButton>
              <LinkedinShareButton
                url={shareUrl}
                summary={shareTitle}
              >
                <LinkedinIcon size={32} />
              </LinkedinShareButton>
            </div>
          )}
        </div>
      </div>

      <CreateDialog
        openPopup={openPopup}
        setOpenPopup={setOpenPopup}
      />
    </div>
  );
};
