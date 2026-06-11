import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import PlaylistTable from "./playlist-table";
import { useTV } from "../tv-provider";
import { X } from "lucide-react";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

interface Props {
  isTVDrawerOpen: boolean;
  setIsTvDrawerOpen: (value: boolean) => void;
}

export const TVScheduleDrawer = ({
  isTVDrawerOpen,
  setIsTvDrawerOpen,
}: Props) => {
  const {
    playLocalFromSchedule,
    playLocalScheduleItem,
    alternateBatchItems,
    activeBatch,
    alternateBatch,
  } = useTV();

  const ongoingLabel = `Ongoing schedule (Batch ${activeBatch ?? "—"})`;
  const upcomingLabel = `Upcoming schedule (Batch ${alternateBatch ?? "—"})`;

  return (
    <Drawer
      open={isTVDrawerOpen}
      onOpenChange={setIsTvDrawerOpen}
    >
      <DrawerContent
        className={`${DRAWER_Z_INDEX} custom-scrollbar ml-auto h-screen w-full space-y-2 overflow-y-auto rounded-t-full p-4 sm:h-[95vh] sm:w-[420px]`}
      >
        <DrawerHeader>
          <DrawerTitle className="text-2xl">TV schedule</DrawerTitle>
        </DrawerHeader>

        <button
          type="button"
          onClick={() => setIsTvDrawerOpen(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-black hover:bg-gray-200"
        >
          <X size={24} />
        </button>

        <div className="h-[calc(100vh-80px)] space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-black">{ongoingLabel}</h3>
            <PlaylistTable
              variant="activeBatch"
              forceGlobalTimes
              onSelectChannel={index => {
                playLocalFromSchedule(index);
                setIsTvDrawerOpen(false);
              }}
            />
          </div>

          {alternateBatchItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-black">
                {upcomingLabel}
              </h3>
              <PlaylistTable
                variant="alternateBatch"
                forceGlobalTimes
                onSelectChannel={i => {
                  playLocalScheduleItem(alternateBatchItems[i]);
                  setIsTvDrawerOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
