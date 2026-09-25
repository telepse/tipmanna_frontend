"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { toast } from "react-toastify";

import {
  getPublicTipperProfileAction,
  type PublicTipperProfile,
} from "@/actions/tipper-profile";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const TipperProfileClient = dynamic(
  () =>
    import("@/components/tipper/tipper-profile-client").then(m => ({
      default: m.TipperProfileClient,
    })),
  { loading: () => <ProfileDrawerLoading /> }
);

function ProfileDrawerLoading() {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
      <Loader2
        className="size-5 animate-spin"
        aria-hidden
      />
      Loading profile…
    </div>
  );
}

function publicTipperProfileKey(slug: string) {
  return ["public-tipper-profile", slug] as const;
}

function profileMatchesSlug(
  profile: PublicTipperProfile,
  slug: string
): boolean {
  const normalized = slug.toLowerCase();
  if (profile.profileSlug.toLowerCase() === normalized) return true;
  if (profile.displayUsername?.toLowerCase() === normalized) return true;
  if (profile.publicLabel?.toLowerCase() === normalized) return true;
  return false;
}

async function fetchPublicTipperProfile(slug: string) {
  const res = await getPublicTipperProfileAction(slug);
  if (!res.success || !res.data) {
    throw new Error(res.message ?? "Could not load profile");
  }
  return res;
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
  const slug = username?.trim() || null;
  const swrKey = open && slug ? publicTipperProfileKey(slug) : null;
  const lastErrorToastKeyRef = useRef<string | null>(null);

  const {
    data: profileRes,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(swrKey, () => fetchPublicTipperProfile(slug!), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    keepPreviousData: true,
    shouldRetryOnError: true,
  });

  useEffect(() => {
    if (!profileRes?.success || !profileRes.data) return;
    if (profileRes.data.kind === "visitor") {
      window.location.assign(
        `/visitor/${encodeURIComponent(profileRes.data.profileSlug)}`
      );
    }
  }, [profileRes]);

  useEffect(() => {
    if (!error || !slug) return;
    const toastKey = `${slug}:${error instanceof Error ? error.message : "error"}`;
    if (lastErrorToastKeyRef.current === toastKey) return;
    lastErrorToastKeyRef.current = toastKey;
    toast.error(
      error instanceof Error ? error.message : "Could not load profile"
    );
  }, [error, slug]);

  useEffect(() => {
    if (!open) lastErrorToastKeyRef.current = null;
  }, [open]);

  const data = useMemo(() => {
    if (!slug || !profileRes?.success || !profileRes.data) return null;
    const p = profileRes.data;
    if (p.kind === "visitor") return null;
    if (profileMatchesSlug(p, slug)) return p;
    if (!isLoading && !isValidating) return p;
    return null;
  }, [profileRes, slug, isLoading, isValidating]);

  const showLoading =
    open && Boolean(slug) && !data && !error && (isLoading || isValidating);

  const showError = open && Boolean(slug) && Boolean(error) && !data;

  const href = slug ? `/tipper/${encodeURIComponent(slug)}` : "/tipper";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        className="flex h-[92vh] flex-col overflow-hidden"
        style={{ zIndex: 100037 }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
          <DrawerTitle className="text-base font-semibold">
            {slug ? `@${slug}` : "Member profile"}
          </DrawerTitle>
          <div className="flex items-center gap-2">
            {slug ? (
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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-8">
          {showLoading ? (
            <ProfileDrawerLoading />
          ) : showError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                Could not load this profile.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void mutate()}
              >
                Try again
              </Button>
            </div>
          ) : data ? (
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
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
