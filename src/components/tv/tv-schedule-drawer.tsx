/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// Local imports
import PlaylistTable from "./playlist-table";
import { useTV } from "../tv-provider";

interface Props {
  isTVDrawerOpen: boolean;
  setIsTvDrawerOpen: (value: boolean) => void;
  broadcastEpoch: number;
  items: any[];
  showTimes?: boolean;
  onSelectChannel: (i: number) => void;
}

export const TVScheduleDrawer = ({
  isTVDrawerOpen,
  setIsTvDrawerOpen,
  broadcastEpoch,
  items,
  showTimes,
  onSelectChannel,
}: Props) => {
  const { setCurrentIndex, setMode } = useTV();

  const handleSelectChannel = (index: number) => {
    setMode("LOCAL");
    setCurrentIndex(index);
  };

  return (
    <Drawer
      open={isTVDrawerOpen}
      onOpenChange={setIsTvDrawerOpen}
    >
      <DrawerContent className="z-50 h-screen space-y-2 overflow-y-auto rounded-t-full p-4">
        <DrawerHeader>
          <DrawerTitle className="text-2xl">TV schedule</DrawerTitle>
        </DrawerHeader>

        <div className="h-[calc(100vh-80px)] space-y-4 overflow-y-auto">
          <PlaylistTable
            broadcastEpoch={broadcastEpoch}
            items={items}
            showTimes={showTimes}
            onSelectChannel={onSelectChannel}
            totalDuration={0}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
