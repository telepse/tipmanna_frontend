"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useCreatorDrawerData } from "@/hooks/use-creator-drawer-data";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";
import { cn } from "@/lib/utils";

const HostCreatorPageClient = dynamic(
  () =>
    import("@/components/host/host-creator-page-client").then(m => ({
      default: m.HostCreatorPageClient,
    })),
  {
    ssr: false,
    loading: () => <CreatorDrawerSkeleton />,
  }
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string | null;
};

function CreatorDrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="flex items-center gap-4">
        <div className="size-24 rounded-full bg-neutral-200" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-neutral-200" />
          <div className="h-4 w-24 rounded bg-neutral-200" />
        </div>
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-16 rounded bg-neutral-200"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] bg-neutral-200"
          />
        ))}
      </div>
    </div>
  );
}

export function CreatorDrawer({ open, onOpenChange, username }: Props) {
  const handle = username?.trim().replace(/^@/, "") ?? "";
  const { profile, loading, error } = useCreatorDrawerData(handle, open);

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
          {loading && !profile ? (
            <CreatorDrawerSkeleton />
          ) : profile ? (
            <HostCreatorPageClient
              key={handle}
              profile={profile}
              variant="drawer"
              className="min-h-0 pb-4"
              onVideoPlay={() => onOpenChange(false)}
            />
          ) : (
            <div className="space-y-3 px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm">
                {error
                  ? "Could not load this creator profile."
                  : "Creator profile not found."}
              </p>
              {handle ? (
                <Link
                  href={`/@${encodeURIComponent(handle)}`}
                  className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  Open full profile page
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
