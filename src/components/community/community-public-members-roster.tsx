"use client";

import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  fetchCommunityPublicMembers,
  invalidateCommunityPublicMembersCache,
  type CommunityPublicMember,
} from "@/lib/community-public-members";
import { Button } from "@/components/ui/button";
import { PublicTipperProfileDrawer } from "@/components/community/public-tipper-profile-drawer";

type Props = {
  communityId: string;
  communityType?: string;
  /** Refetch after join (optional). */
  refreshNonce?: number;
  className?: string;
};

export function CommunityPublicMembersRoster({
  communityId,
  communityType,
  refreshNonce = 0,
  className,
}: Props) {
  const [members, setMembers] = useState<CommunityPublicMember[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerUsername, setDrawerUsername] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadPage = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!communityId.trim()) return;
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        const bypass = refreshNonce > 0 && !append && !cursor;
        if (bypass) invalidateCommunityPublicMembersCache(communityId);
        const data = await fetchCommunityPublicMembers(communityId, {
          cursor: cursor ?? undefined,
          limit: 10,
          bypassCache: bypass,
        });
        setMembers(prev =>
          append ? [...prev, ...data.members] : data.members
        );
        setNextCursor(data.nextCursor);
      } catch {
        setError("Could not load members");
        if (!append) setMembers([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [communityId, refreshNonce]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadPage(null, false);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  if (loading) {
    return (
      <div className={className}>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Members</h3>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2
            className="size-4 animate-spin"
            aria-hidden
          />
          Loading members…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Members</h3>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Members</h3>
        <p className="text-muted-foreground text-sm">No public members yet.</p>
      </div>
    );
  }

  const openMemberDrawer = (username: string) => {
    setDrawerUsername(username);
    setDrawerOpen(true);
  };

  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-foreground text-sm font-semibold">Members</h3>

        <p className="text-muted-foreground text-[10px]">
          {communityType ? `${communityType} - community` : ""}
        </p>
      </div>

      <ul className="divide-border divide-y rounded-md border">
        {members.map(m => (
          <li key={m.membershipId}>
            <Link
              href={`/tipper/${encodeURIComponent(m.username)}`}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 px-3 py-2.5 transition-colors"
              onClick={e => {
                if (
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey ||
                  e.button !== 0
                ) {
                  return;
                }
                e.preventDefault();
                openMemberDrawer(m.username);
              }}
            >
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-medium">
                  @{m.username}
                </p>
                <p className="text-muted-foreground text-xs">
                  {m.tipCount.toLocaleString()} tips
                  {m.tipAmountMinor > 0
                    ? ` · £${(m.tipAmountMinor / 100).toFixed(2)}`
                    : ""}
                  {m.paidRenewalCount > 0
                    ? ` · ${m.paidRenewalCount} paid renewal${m.paidRenewalCount === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
              <ChevronRight
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
      {nextCursor ? (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadPage(nextCursor, true)}
          >
            {loadingMore ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden
                />
                Loading…
              </>
            ) : (
              "Next"
            )}
          </Button>
        </div>
      ) : null}
      <PublicTipperProfileDrawer
        username={drawerUsername}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
