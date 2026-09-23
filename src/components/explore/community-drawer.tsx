"use client";

import dynamic from "next/dynamic";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { cn } from "@/lib/utils";

const CommunityJoinPanel = dynamic(
  () =>
    import("@/components/community/community-join-panel").then(m => ({
      default: m.CommunityJoinPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <span className="text-muted-foreground animate-pulse text-sm">
          Loading community…
        </span>
      </div>
    ),
  }
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string | null;
};

export function CommunityDrawer({ open, onOpenChange, communityId }: Props) {
  const id = communityId?.trim() ?? "";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        aria-describedby={undefined}
        className={cn(
          DRAWER_Z_INDEX,
          "flex max-h-[92vh] flex-col overflow-hidden rounded-t-[32px] bg-white p-0"
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {id ? (
            <CommunityJoinPanel
              key={id}
              communityId={id}
              variant="drawer"
              signInRedirectPath={exploreCommunityJoinHref(id)}
            />
          ) : (
            <p className="text-muted-foreground p-8 text-center text-sm">
              Community not found.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
