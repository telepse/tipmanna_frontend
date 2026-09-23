"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { getPublicTipperProfileAction } from "@/actions/tipper-profile";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

const TipperProfileClient = dynamic(
  () =>
    import("@/components/tipper/tipper-profile-client").then(m => ({
      default: m.TipperProfileClient,
    })),
  { loading: () => <ProfileDrawerLoading /> }
);

function ProfileDrawerLoading() {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
      <Loader2
        className="size-5 animate-spin"
        aria-hidden
      />
      Loading profile…
    </div>
  );
}

type Props = {
  username: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PublicTipperProfileDrawer({
  username,
  open,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof getPublicTipperProfileAction>
  > | null>(null);

  const load = useCallback(async (slug: string) => {
    setLoading(true);
    setProfile(null);
    try {
      const res = await getPublicTipperProfileAction(slug);
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load profile");
        onOpenChange(false);
        return;
      }
      if (res.data.kind === "visitor") {
        window.location.assign(
          `/visitor/${encodeURIComponent(res.data.profileSlug)}`
        );
        return;
      }
      setProfile(res);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || !username?.trim()) return;
    void load(username.trim());
  }, [load, open, username]);

  useEffect(() => {
    if (open) return;
    setProfile(null);
  }, [open]);

  const data = profile?.success ? profile.data : null;
  const href = username
    ? `/tipper/${encodeURIComponent(username.trim())}`
    : "/tipper";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        className="max-h-[92vh] overflow-y-auto"
        style={{ zIndex: DRAWER_Z_INDEX }}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <DrawerTitle className="text-base font-semibold">
            {username ? `@${username}` : "Member profile"}
          </DrawerTitle>
          <div className="flex items-center gap-2">
            {username ? (
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <Link href={href}>Open full profile</Link>
              </Button>
            ) : null}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-md p-1"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="px-2 pb-8">
          {loading || !data ? (
            <ProfileDrawerLoading />
          ) : (
            <TipperProfileClient
              events={data.events}
              iTipped={data.totalTipped}
              causes={[]}
              contents={[]}
              tippedVideos={data.videos}
              viewMode="public"
              profileSlug={data.profileSlug}
              displayName={data.publicLabel}
              isAnonymous={data.isAnonymous}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
