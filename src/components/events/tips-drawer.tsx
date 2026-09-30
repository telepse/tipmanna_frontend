"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { TipsFeedPanel } from "@/components/events/tips-feed-panel";
import {
  DRAWER_Z_INDEX,
  IMMERSIVE_DRAWER_OVERLAY_Z_INDEX,
  IMMERSIVE_DRAWER_Z_INDEX,
  PLAYBACK_OVERLAY_NESTED_OVERLAY_Z_INDEX,
  PLAYBACK_OVERLAY_NESTED_Z,
  PLAYBACK_OVERLAY_NESTED_Z_INDEX,
} from "@/lib/drawer-z-index";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  channelId: string | null;
  eventRoomTipCount?: number;
  videoTipCount?: number;
  communityBankName?: string | null;
  stackAboveImmersive?: boolean;
  stackAbovePlaybackOverlay?: boolean;
};

export function TipsDrawer({
  open,
  onOpenChange,
  eventId,
  channelId,
  eventRoomTipCount,
  videoTipCount,
  communityBankName = null,
  stackAboveImmersive = false,
  stackAbovePlaybackOverlay = false,
}: Props) {
  const overlayClassName = stackAbovePlaybackOverlay
    ? PLAYBACK_OVERLAY_NESTED_OVERLAY_Z_INDEX
    : stackAboveImmersive
      ? IMMERSIVE_DRAWER_OVERLAY_Z_INDEX
      : undefined;
  const contentClassName = stackAbovePlaybackOverlay
    ? PLAYBACK_OVERLAY_NESTED_Z_INDEX
    : stackAboveImmersive
      ? IMMERSIVE_DRAWER_Z_INDEX
      : DRAWER_Z_INDEX;
  const contentZIndex = stackAbovePlaybackOverlay
    ? PLAYBACK_OVERLAY_NESTED_Z
    : stackAboveImmersive
      ? 100019
      : undefined;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        data-testid="tips-drawer"
        overlayClassName={overlayClassName}
        className={cn(
          contentClassName,
          "flex h-[72vh] flex-col overflow-hidden rounded-t-[32px] bg-white p-0"
        )}
        style={contentZIndex != null ? { zIndex: contentZIndex } : undefined}
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
