"use client";

import { ArrowUp, X } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";
import type { RoomCharacter } from "@/types";

import { TvPlaylistPreview } from "./tv-playlist-preview";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChannel: (index: number) => void;
  onContinueCommentToTip?: () => void;
  tippingCharacters?: RoomCharacter[];
  /** Opens the full batch schedule drawer (portrait: "See full schedule"). */
  onOpenFullSchedule: () => void;
};

export function TvPreviewPlaylistDrawer({
  open,
  onOpenChange,
  onSelectChannel,
  onContinueCommentToTip,
  tippingCharacters,
  onOpenFullSchedule,
}: Props) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        className={`${DRAWER_Z_INDEX} custom-scrollbar ml-auto h-screen w-full space-y-2 rounded-t-full p-4 sm:h-[95vh] sm:w-[420px]`}
      >
        <DrawerHeader>
          <DrawerTitle className="text-2xl">TV Playlist</DrawerTitle>
        </DrawerHeader>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-black hover:bg-gray-200"
          aria-label="Close TV playlist"
        >
          <X size={24} />
        </button>

        <div className="custom-scrollbar hide__scrollbar h-[calc(100vh-80px)] space-y-4 overflow-y-auto p-2">
          <TvPlaylistPreview
            layout="mobile"
            onSelectChannel={index => {
              onSelectChannel(index);
              onOpenChange(false);
            }}
            onContinueCommentToTip={onContinueCommentToTip}
            tippingCharacters={tippingCharacters}
          />

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onOpenFullSchedule();
            }}
            className="mt-2 flex items-center gap-2 text-sm font-medium text-black"
          >
            See full schedule
            <ArrowUp className="size-4" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
