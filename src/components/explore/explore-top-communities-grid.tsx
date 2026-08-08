"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";

import type { CommunityExploreCatalogRow } from "@/actions/communities";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { Button } from "@/components/ui/button";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import type { RootState } from "@/redux/store";
import { UserRound, UsersRound } from "lucide-react";

function formatCommunityDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  communities: CommunityExploreCatalogRow[];
  className?: string;
  /** Community ids that cannot be joined yet (e.g. awaiting approval). */
  lockedCommunityIds?: readonly string[];
}

export function ExploreTopCommunitiesGrid({
  communities,
  className,
  lockedCommunityIds = [],
}: Props) {
  const lockedIds = new Set(lockedCommunityIds);
  const router = useRouter();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReturnTo, setSignInReturnTo] = useState(
    "/explore?tab=my-communities"
  );

  const openJoinSignIn = useCallback((communityId: string) => {
    setSignInReturnTo(exploreCommunityJoinHref(communityId));
    setSignInOpen(true);
  }, []);

  if (communities.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No communities to show yet. Check back as creators launch new
        communities.
      </p>
    );
  }

  return (
    <>
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={open => {
          setSignInOpen(open);
        }}
        signInTitle="Sign in to join this community"
        getRedirectPathAfterVerify={() => signInReturnTo}
        onVerified={() => router.push(signInReturnTo)}
      />

      <div className={className ?? "grid gap-3 sm:grid-cols-3"}>
        {communities.map((c, i) => {
          const locked = lockedIds.has(c.id);
          return (
            <div
              key={c.id}
              className="border-border bg-card flex h-full flex-col rounded-lg border p-3 shadow-sm"
            >
              <div className="flex gap-2">
                {c.logoUrl ? (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={c.logoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="border-moonstone-blue flex size-10 shrink-0 items-center justify-center rounded-md border-2 bg-white">
                    <UserRound className="size-6" />
                  </div>
                )}

                <div className="min-w-0 space-y-0.5">
                  <h5 className="line-clamp-2 text-sm leading-normal font-medium break-words">
                    {c.name}
                  </h5>
                </div>
              </div>

              <div className="mt-1 min-h-0 flex-1">
                {c.description ? (
                  <p className="text-muted-foreground line-clamp-2 text-xs break-words">
                    {c.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    No description
                  </p>
                )}
              </div>

              <div className="text-muted-foreground mt-3 space-y-0.5 text-[11px]">
                <p>
                  {c.totalTips} tips &middot; {c.memberCount} members &middot;{" "}
                  {c.numVideos ?? 0} videos
                </p>
                <p>Created {formatCommunityDate(c.createdAt)}</p>
              </div>

              <div className="mt-3 flex gap-2">
                {locked ? (
                  <p className="text-muted-foreground w-full text-center text-xs">
                    Awaiting approval
                  </p>
                ) : c.viewer?.joined ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Link href={exploreCommunityJoinHref(c.id)}>Open</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      if (!isAuthenticated) openJoinSignIn(c.id);
                      else router.push(exploreCommunityJoinHref(c.id));
                    }}
                  >
                    Join
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
