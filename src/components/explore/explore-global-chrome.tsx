"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getMeJoinedCommunitiesAction } from "@/actions/communities";
import { useSideChick } from "@/components/community/side-chick-provider";
import { usePusherTrackingGlobalTV } from "@/hooks/use-global-viewer-count";
import type { UserInfo } from "@/types/tracking.types";
import type { RootState } from "@/redux/store";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import { prefetchWatchTvFromExplore } from "@/lib/explore-watch-tv";
import { getOrCreateAnonymousViewer } from "@/lib/anonymous-viewer";
import { pickContrastFgForHex } from "@/lib/pick-contrast-fg-for-bg";

const EXPLORE = "/explore";

type MembershipRow = {
  communityId: string;
  active: boolean;
  revokedAt: string | null;
  membershipStatus: string;
  expiresAt: string | null;
  community?: { id: string; name: string };
};

export type SideChickMenuRow = Pick<MembershipRow, "communityId" | "community">;

function usableMembership(m: MembershipRow): boolean {
  if (!m.active || m.revokedAt) return false;
  if (m.membershipStatus !== "active") return false;
  if (m.expiresAt && new Date(m.expiresAt) <= new Date()) return false;
  return Boolean(m.community?.name);
}

export function SideChickCommunityMenu({
  rows,
  highlight,
  triggerClassName = "",
  activeDedicatedCommunityId = null,
}: {
  rows: SideChickMenuRow[];
  highlight: boolean;
  triggerClassName?: string;
  /** When set, switching to another community requires confirmation. */
  activeDedicatedCommunityId?: string | null;
}) {
  const [pendingSwitch, setPendingSwitch] = useState<{
    communityId: string;
    name: string;
  } | null>(null);

  const requestDedicatedSwitch = (
    communityId: string,
    name: string,
    e: React.MouseEvent
  ) => {
    if (
      activeDedicatedCommunityId &&
      activeDedicatedCommunityId !== communityId
    ) {
      e.preventDefault();
      setPendingSwitch({ communityId, name });
      return;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 rounded-full px-3 text-xs font-normal",
              highlight && "bg-background shadow-sm",
              triggerClassName
            )}
          >
            Side chick
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="z-[12550]"
        >
          <DropdownMenuLabel className="text-xs">
            Dedicated mode (per community)
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {rows.length === 0 ? (
            <div className="text-muted-foreground px-2 py-3 text-xs">
              Join a community first, then open its dedicated link from here.
            </div>
          ) : (
            rows.map(m => (
              <DropdownMenuItem
                key={m.communityId}
                asChild
              >
                <Link
                  href={`/community/side-chick/${encodeURIComponent(m.communityId)}`}
                  onClick={e =>
                    requestDedicatedSwitch(
                      m.communityId,
                      m.community?.name ?? m.communityId,
                      e
                    )
                  }
                >
                  {m.community?.name ?? m.communityId}
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={Boolean(pendingSwitch)}
        onOpenChange={open => {
          if (!open) setPendingSwitch(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch dedicated community?</DialogTitle>
            <DialogDescription>
              You are currently focused on one community. Opening{" "}
              <span className="text-foreground font-medium">
                {pendingSwitch?.name}
              </span>{" "}
              will switch dedicated mode to that community.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            {pendingSwitch ? (
              <Button
                asChild
                size="sm"
              >
                <Link
                  href={`/community/side-chick/${encodeURIComponent(pendingSwitch.communityId)}`}
                >
                  Switch community
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPendingSwitch(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type ExploreGlobalChromeSurface = "join" | "side-chick" | null;

/**
 * Explore header + sub-nav using router links (for pages outside /explore so navigation matches Explore).
 */
export function ExploreGlobalChrome({
  children,
  activeSurface = null,
}: {
  children: React.ReactNode;
  activeSurface?: ExploreGlobalChromeSurface;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sideChick = useSideChick();
  const communityFeatureEnabled =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";
  const sideChickLocked =
    !sideChick.loading &&
    Boolean(sideChick.active && sideChick.activation?.communityId) &&
    communityFeatureEnabled;
  const activeDedicatedCommunityId = sideChickLocked
    ? (sideChick.activation?.communityId ?? null)
    : null;

  const [viewerUser, setViewerUser] = useState<UserInfo>(() =>
    getOrCreateAnonymousViewer()
  );
  useEffect(() => {
    setViewerUser(getOrCreateAnonymousViewer());
  }, []);

  const { activeUsers: exploreLiveViewers } = usePusherTrackingGlobalTV({
    tvId: "global-tv",
    userInfo: viewerUser,
  });

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const userId = useSelector((s: RootState) => s.auth.user?.id);

  const [joinedMemberships, setJoinedMemberships] = useState<MembershipRow[]>(
    []
  );

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setJoinedMemberships([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await getMeJoinedCommunitiesAction();
      if (cancelled) return;
      if (r.success && Array.isArray(r.data?.memberships)) {
        setJoinedMemberships(r.data.memberships as MembershipRow[]);
      } else {
        setJoinedMemberships([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  const sideChickMenuRows = useMemo(
    () => joinedMemberships.filter(usableMembership),
    [joinedMemberships]
  );

  const headerTint =
    communityFeatureEnabled &&
    sideChickLocked &&
    sideChick.activation?.customization?.headerColor
      ? sideChick.activation.customization.headerColor
      : null;

  const headerContrast = useMemo(
    () => (headerTint ? pickContrastFgForHex(headerTint) : null),
    [headerTint]
  );

  const sideChickPillActive =
    "bg-amber-400 font-medium text-neutral-950 shadow-sm ring-1 ring-amber-600/35";

  const [dedicatedModalOpen, setDedicatedModalOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);

  useEffect(() => {
    if (sideChickLocked) {
      setDedicatedModalOpen(true);
    }
  }, [sideChickLocked]);

  const tab = searchParams.get("tab");
  const feedTab = searchParams.get("feedTab");
  const isExplore = pathname === EXPLORE || pathname === `${EXPLORE}/`;
  const isTvPage =
    pathname === "/tv" ||
    (typeof pathname === "string" && pathname.startsWith("/tv/"));
  const feedActive =
    isExplore &&
    tab !== "discover" &&
    tab !== "my-communities" &&
    feedTab !== "tv";
  const discoverActive = isExplore && tab === "discover";
  const findCommunitiesActive = isExplore && tab === "my-communities";
  const watchTvActive = isTvPage;
  const communityFeedActive = isExplore && feedTab === "community";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2",
          headerTint ? "" : "bg-white"
        )}
        style={
          headerTint && headerContrast
            ? {
                backgroundColor: headerTint,
                color: headerContrast.foreground,
              }
            : headerTint
              ? { backgroundColor: headerTint }
              : undefined
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/explore"
            className="racing_sans_one text-sm sm:text-2xl"
            style={
              headerContrast ? { color: headerContrast.foreground } : undefined
            }
          >
            <span className={headerContrast ? "" : "text-primary"}>tip</span>
            manna
          </Link>

          <div className="flex items-center gap-1 rounded-full p-1 text-sm">
            {sideChickLocked ? (
              <button
                type="button"
                onClick={() => setDedicatedModalOpen(true)}
                className="size-3 shrink-0 animate-pulse rounded-full bg-amber-400 ring-2 ring-amber-200 sm:hidden"
                title="Dedicated community mode"
                aria-label="Dedicated community mode — tap for details"
              />
            ) : null}

            <Link
              href={`${EXPLORE}?tab=discover`}
              onMouseEnter={prefetchExploreFeedInitial}
              className="relative p-1"
            >
              <Input
                readOnly
                type="text"
                placeholder="Search videos..."
                className="pointer-events-none h-4 w-32 text-xs"
                tabIndex={-1}
              />
              <Search className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-600" />
            </Link>

            <Link
              href={`${EXPLORE}?feedTab=community`}
              onMouseEnter={prefetchExploreFeedInitial}
              className={cn(
                "hidden rounded-full px-3 py-1 transition sm:inline-block",
                communityFeedActive && "bg-background shadow-sm"
              )}
            >
              Community
            </Link>
            <Link
              href={`${EXPLORE}?tab=discover`}
              className={cn(
                "hidden rounded-full px-3 py-1 transition sm:inline-block",
                discoverActive && "bg-background shadow-sm"
              )}
            >
              Discover
            </Link>

            {communityFeatureEnabled ? (
              <>
                <Link
                  href={`${EXPLORE}?tab=my-communities`}
                  className={cn(
                    "hidden rounded-full px-3 py-1 text-xs transition sm:inline-block",
                    activeSurface === "join" && "bg-background shadow-sm"
                  )}
                >
                  Join communities
                </Link>
                <div className="hidden sm:block">
                  <SideChickCommunityMenu
                    rows={sideChickMenuRows}
                    highlight={activeSurface === "side-chick"}
                    activeDedicatedCommunityId={activeDedicatedCommunityId}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {communityFeatureEnabled && sideChickLocked ? (
            <button
              type="button"
              onClick={() => setDedicatedModalOpen(true)}
              className="hidden size-3 shrink-0 animate-pulse rounded-full bg-amber-400 ring-2 ring-amber-200 sm:inline-block"
              title="Dedicated community mode"
              aria-label="Dedicated community mode — tap for details"
            />
          ) : null}
        </div>

        <div className="-mr-10 flex items-center gap-1">
          <span
            className={cn(
              "truncate text-xs",
              !headerContrast && "text-muted-foreground"
            )}
            style={
              headerContrast
                ? { color: headerContrast.mutedForeground }
                : undefined
            }
          >
            <div className="flex items-center gap-1">
              <span className="bg-moonstone-blue size-[10px] rounded-full sm:size-4"></span>{" "}
              <span className="text-[10px] font-medium whitespace-nowrap sm:text-sm">
                {exploreLiveViewers.length} online
              </span>
            </div>
          </span>
        </div>

        <span className="w-8 shrink-0" />
      </header>

      <div
        className="flex items-center justify-between px-2 py-1"
        style={
          headerTint && headerContrast
            ? {
                backgroundColor: headerTint,
                color: headerContrast.foreground,
              }
            : undefined
        }
      >
        <div className="flex items-center gap-1">
          <div>
            <Link
              href={EXPLORE}
              onMouseEnter={prefetchExploreFeedInitial}
              className={cn(
                "inline-block rounded-full px-2.5 py-1 text-xs transition sm:px-3",
                feedActive &&
                  (sideChickLocked
                    ? sideChickPillActive
                    : "bg-background shadow-sm")
              )}
            >
              Feed
            </Link>

            <Link
              href="/tv"
              data-testid="explore-watch-tv"
              onMouseEnter={() => prefetchWatchTvFromExplore(router)}
              className={cn(
                "inline-block rounded-full px-2.5 py-1 text-xs transition sm:px-3",
                watchTvActive && "bg-background shadow-sm"
              )}
            >
              Watch TV
            </Link>

            <Link
              href={`${EXPLORE}?tab=my-communities`}
              className={cn(
                "inline-block rounded-full px-2.5 py-1 text-xs transition sm:px-3",
                findCommunitiesActive &&
                  (sideChickLocked
                    ? sideChickPillActive
                    : "bg-background shadow-sm")
              )}
            >
              Find Communities
            </Link>

            {communityFeatureEnabled ? (
              <>
                <Link
                  href={`${EXPLORE}?tab=my-communities`}
                  className={cn(
                    "inline-block rounded-full px-2.5 py-1 text-xs transition sm:hidden sm:px-3",
                    activeSurface === "join" && "bg-background shadow-sm"
                  )}
                >
                  Join
                </Link>
                <span className="inline-flex sm:hidden">
                  <SideChickCommunityMenu
                    rows={sideChickMenuRows}
                    highlight={activeSurface === "side-chick"}
                    triggerClassName="h-7 px-2.5 text-[11px]"
                    activeDedicatedCommunityId={activeDedicatedCommunityId}
                  />
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        open={dedicatedModalOpen}
        onOpenChange={setDedicatedModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Explore feed and TV are limited to your dedicated community
            </DialogTitle>
            <DialogDescription>
              You are focused on{" "}
              <span className="text-foreground font-medium">
                {sideChick.activation?.community.name ?? "your community"}
              </span>
              . Trends, Saves, and Live TV on Explore are limited to that
              community until you reactivate Tipmanna Public and your other feed
              settings.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            disabled={exitBusy}
            onClick={() => {
              setExitBusy(true);
              void sideChick
                .exitDedicatedMode()
                .then(ok => {
                  if (ok) setDedicatedModalOpen(false);
                })
                .finally(() => setExitBusy(false));
            }}
          >
            Reactivate Tipmanna Public (exit dedicated mode)
          </Button>
        </DialogContent>
      </Dialog>

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
