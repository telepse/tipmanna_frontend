/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

import { DiscoverPanel } from "./discover-panel";

interface Props {
  isExploreDrawerOpen: boolean;
  setIsExploreDrawerOpen: (value: boolean) => void;
  setIsProfileDrawerOpen: (value: boolean) => void;
  contents: any[];
  tippers: any[];
  latestContents: any[];
  mostTippedContents: any[];
}

export const ExploreDrawer = ({
  isExploreDrawerOpen,
  setIsExploreDrawerOpen,
  contents,
  tippers,
  latestContents,
  mostTippedContents,
  setIsProfileDrawerOpen,
}: Props) => {
  return (
    <Drawer
      open={isExploreDrawerOpen}
      onOpenChange={setIsExploreDrawerOpen}
    >
      <DrawerContent
        className={`${DRAWER_Z_INDEX} h-[70vh] space-y-2 overflow-y-auto rounded-t-full p-4`}
      >
        <button
          type="button"
          onClick={() => setIsExploreDrawerOpen(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-black hover:bg-gray-200"
        >
          <X size={24} />
        </button>

        <DrawerHeader>
          <DrawerTitle className="text-2xl">Discover contents</DrawerTitle>
        </DrawerHeader>

        <DiscoverPanel
          contents={contents}
          tippers={tippers}
          latestContents={latestContents}
          mostTippedContents={mostTippedContents}
          showHeading={false}
          onOpenBookmarks={() => {
            setIsExploreDrawerOpen(false);
            setIsProfileDrawerOpen(true);
          }}
        />
      </DrawerContent>
    </Drawer>
  );
};
