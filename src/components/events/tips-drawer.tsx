"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { TipsFeedPanel } from "@/components/events/tips-feed-panel";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  channelId: string | null;
  eventRoomTipCount?: number;
  videoTipCount?: number;
  communityBankName?: string | null;
};

export function TipsDrawer({
  open,
  onOpenChange,
  eventId,
  channelId,
  eventRoomTipCount,
  videoTipCount,
  communityBankName = null,
}: Props) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        data-testid="tips-drawer"
        className={`${DRAWER_Z_INDEX} flex h-[72vh] flex-col overflow-hidden rounded-t-[32px] bg-white p-0`}
      >
        <TipsFeedPanel
          variant="drawer"
          enabled={open}
          eventId={eventId}
          channelId={channelId}
          eventRoomTipCount={eventRoomTipCount}
          videoTipCount={videoTipCount}
          communityBankName={communityBankName}
          onClose={() => onOpenChange(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}
