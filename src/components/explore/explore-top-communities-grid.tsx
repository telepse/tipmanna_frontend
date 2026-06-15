"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";

import type { CommunityExploreCatalogRow } from "@/actions/communities";
import SignInDialog from "@/components/auth/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import type { RootState } from "@/redux/store";

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
}

export function ExploreTopCommunitiesGrid({ communities, className }: Props) {
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
    return null;
  }

  return (
    <>
      <SignInDialog
        open={signInOpen}
        onOpenChange={open => {
          setSignInOpen(open);
        }}
        returnTo={signInReturnTo}
        defaultUserType="tipper"
      />

      <div className={className ?? "grid gap-3 sm:grid-cols-3"}>
        {communities
          .filter(c => c.name === "Tipmanna Public")
          .map((c, i) => (
            <div
              key={c.id}
              className="border-border bg-card flex flex-col rounded-lg border p-3 shadow-sm"
            >
              <p className="text-muted-foreground text-[10px] font-medium uppercase">
                #{i + 1}
              </p>
              <p className="truncate text-sm font-semibold">{c.name}</p>
              {c.description ? (
                <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
                  {c.description}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-xs italic">
                  No description
                </p>
              )}
              <p className="text-muted-foreground mt-2 text-[11px]">
                £{c.totalTips} tips · {c.memberCount} members
              </p>
              <p className="text-muted-foreground text-[11px]">
                Created {formatCommunityDate(c.createdAt)}
              </p>
              <div className="mt-3 flex gap-2">
                {c.viewer?.joined ? (
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
          ))}
      </div>
    </>
  );
}
