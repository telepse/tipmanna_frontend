"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";

import type { CommunityExploreCatalogRow } from "@/actions/communities";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import type { RootState } from "@/redux/store";
import { cn } from "@/lib/utils";
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

  const renderCard = (c: CommunityExploreCatalogRow) => {
    const locked = lockedIds.has(c.id);
    const communityHref = exploreCommunityJoinHref(c.id);
    return (
      <Link
        key={c.id}
        href={locked ? "#" : communityHref}
        aria-disabled={locked}
        onClick={e => {
          if (locked) {
            e.preventDefault();
            return;
          }
          if (!isAuthenticated) {
            e.preventDefault();
            openJoinSignIn(c.id);
          }
        }}
        className={cn(
          "border-border bg-card flex h-full flex-col rounded-lg border p-3 shadow-sm transition-colors",
          locked ? "pointer-events-none opacity-70" : "hover:bg-muted/30"
        )}
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
            <span className="text-primary w-full text-center text-xs font-medium">
              Open community
            </span>
          ) : (
            <span className="text-muted-foreground w-full text-center text-xs">
              {isAuthenticated ? "Join community" : "Sign in to join"}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={open => {
          setSignInOpen(open);
        }}
        signInTitle="Sign in to join this community"
        signupSurface="community_picker"
        getRedirectPathAfterVerify={() => signInReturnTo}
        onVerified={() => router.push(signInReturnTo)}
      />

      {/* Small and medium screens: swipeable */}
      <div className="no-scrollbar hide__scrollbar relative flex items-center gap-4 overflow-x-auto lg:hidden">
        <div className="flex w-full snap-x snap-mandatory space-x-4">
          {communities.map(c => (
            <div
              key={c.id}
              className="w-[80%] flex-shrink-0 snap-center sm:w-[45%]"
            >
              {renderCard(c)}
            </div>
          ))}
        </div>
      </div>

      {/* Large screens: grid */}
      <div className={className ?? "hidden gap-3 lg:grid lg:grid-cols-3"}>
        {communities.map(renderCard)}
      </div>
    </>
  );
}
