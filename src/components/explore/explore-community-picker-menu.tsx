"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import type { CommunityExploreCatalogRow } from "@/actions/communities";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { CommunityJoinOpenControls } from "@/components/community/community-join-open-controls";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useCommunityJoinFlow } from "@/hooks/use-community-join-flow";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import type { RootState } from "@/redux/store";
import { isTipmannaSystemCommunity } from "@/lib/tv-community-picker";

type JoinedMembershipRow = {
  communityId: string;
  community?: { name?: string | null } | null;
};

type Props = {
  eligibleCommunityPickerRows: JoinedMembershipRow[];
  communityFeedSelIds: string[];
  onCommunityFeedPick: (id: string, checked: boolean, multi: boolean) => void;
  communityPickerMultiRef: React.MutableRefObject<boolean>;
  topCommunities: CommunityExploreCatalogRow[];
  catalogAlphabetical: CommunityExploreCatalogRow[];
  topCommunitiesLoading: boolean;
  catalogLoading: boolean;
  onBrowseAllAz: () => void;
};

function CommunityStatsLine({
  community,
}: {
  community: CommunityExploreCatalogRow;
}) {
  return (
    <p className="text-muted-foreground text-[10px] leading-snug">
      {community.totalTips} tips · {community.memberCount} members ·{" "}
      {community.numVideos ?? 0} contents
    </p>
  );
}

export function ExploreCommunityPickerMenu({
  eligibleCommunityPickerRows,
  communityFeedSelIds,
  onCommunityFeedPick,
  communityPickerMultiRef,
  topCommunities,
  catalogAlphabetical,
  topCommunitiesLoading,
  catalogLoading,
  onBrowseAllAz,
}: Props) {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [browseAzOpen, setBrowseAzOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState("");

  const {
    joinCommunityId,
    joinModalOpen,
    closeJoinModal,
    openJoin,
    openCommunity,
    signInOpen,
    setSignInOpen,
    signInReturnTo,
    onSignInVerified,
    signInTitle,
    signupSurface,
  } = useCommunityJoinFlow({
    signupSurface: "community_picker",
    signInTitle: "Sign in to join this community",
  });

  const filteredAlphabetical = useMemo(() => {
    const q = catalogFilter.trim().toLowerCase();
    if (!q) return catalogAlphabetical;
    return catalogAlphabetical.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  }, [catalogAlphabetical, catalogFilter]);

  const featuredCommunities = topCommunities.filter(
    c => !isTipmannaSystemCommunity(c.id, c.name, c.isSystem)
  );

  const systemCommunities = filteredAlphabetical.filter(
    c => !isTipmannaSystemCommunity(c.id, c.name, c.isSystem)
  );

  const renderCommunityRow = useCallback(
    (c: CommunityExploreCatalogRow) => (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-white px-2 py-1.5">
        <button
          type="button"
          className="hover:bg-accent min-w-0 flex-1 rounded-md px-1 py-0.5 text-left transition-colors"
          onClick={() => openCommunity(c.id)}
        >
          <p className="truncate text-xs font-medium">{c.name}</p>
          <CommunityStatsLine community={c} />
        </button>
        <CommunityJoinOpenControls
          communityId={c.id}
          joined={Boolean(c.viewer?.joined)}
          isAuthenticated={isAuthenticated}
          onJoin={openJoin}
          onOpen={openCommunity}
        />
      </div>
    ),
    [isAuthenticated, openCommunity, openJoin]
  );

  return (
    <>
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle={signInTitle}
        signupSurface={signupSurface}
        getRedirectPathAfterVerify={() => signInReturnTo}
        onVerified={onSignInVerified}
      />
      {joinCommunityId ? (
        <JoinCommunityModal
          open={joinModalOpen}
          onOpenChange={open => {
            if (!open) closeJoinModal();
          }}
          communityId={joinCommunityId}
          signInRedirectPath={exploreCommunityJoinHref(joinCommunityId)}
        />
      ) : null}

      <DropdownMenuContent
        className="z-[12550] mr-4 max-h-[min(72dvh,28rem)] w-[min(100vw-4rem,28rem)] overflow-y-auto p-0"
        align="start"
        onPointerDownCapture={e => {
          communityPickerMultiRef.current = Boolean(
            e.shiftKey || e.metaKey || e.ctrlKey
          );
        }}
      >
        <div className="space-y-2 py-2">
          <h5 className="-mb-2 px-4 py-1 text-xs font-bold">
            Communities in Explore feed
          </h5>

          <DropdownMenuSeparator className="border-secondary border-[0.1px]" />

          <div className="px-4">
            {eligibleCommunityPickerRows.length === 0 ? (
              <div className="text-muted-foreground text-xs">
                Join a community to see their content.
              </div>
            ) : (
              eligibleCommunityPickerRows.map(m => {
                const communityName = m.community?.name ?? m.communityId;
                const included = communityFeedSelIds.includes(m.communityId);
                return (
                  <DropdownMenuItem
                    key={m.communityId}
                    className="flex items-center justify-between gap-3 text-xs"
                    onSelect={e => e.preventDefault()}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {communityName}
                    </span>
                    <Switch
                      checked={included}
                      aria-label={`Include ${communityName} in Explore feed`}
                      onCheckedChange={checked => {
                        onCommunityFeedPick(
                          m.communityId,
                          checked,
                          communityPickerMultiRef.current
                        );
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  </DropdownMenuItem>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-2 py-2">
          <h5 className="bg-secondary px-4 py-2 text-xs font-bold">
            Top communities
          </h5>

          <div className="px-4">
            {topCommunitiesLoading ? (
              <p className="text-muted-foreground px-1 py-2 text-xs">
                Loading top communities…
              </p>
            ) : null}

            {featuredCommunities.length > 0 ? (
              <ul className="space-y-2">
                {featuredCommunities.map(c => (
                  <li key={c.id}>{renderCommunityRow(c)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 py-2">
          <div className="bg-secondary flex items-center justify-between gap-2 px-4 py-2">
            <h5 className="text-xs font-bold">
              Explore new communities (
              {systemCommunities.length > 0 ? systemCommunities.length : 0})
            </h5>
            <button
              type="button"
              onClick={() => {
                setBrowseAzOpen(v => !v);
                if (!browseAzOpen) onBrowseAllAz();
              }}
              className="cursor-pointer text-xs font-medium underline underline-offset-2"
            >
              Browse A - Z
            </button>
          </div>
          <div className="px-4">
            <Input
              value={catalogFilter}
              onChange={e => setCatalogFilter(e.target.value)}
              placeholder="Filter by name or description…"
              aria-label="Filter communities"
              className="h-8 text-xs"
              onKeyDown={e => e.stopPropagation()}
            />
            {browseAzOpen || catalogFilter.trim() ? (
              <div className="mt-2 space-y-2">
                {catalogLoading ? (
                  <p className="text-muted-foreground px-1 py-2 text-xs">
                    Loading communities…
                  </p>
                ) : systemCommunities.length === 0 ? (
                  <p className="text-muted-foreground px-1 py-2 text-xs">
                    No communities match your filter.
                  </p>
                ) : (
                  <ScrollArea className="max-h-48 pr-2">
                    <ul className="divide-border divide-y rounded-md border">
                      {systemCommunities.map(c => (
                        <li
                          key={c.id}
                          className="px-3 py-2"
                        >
                          {renderCommunityRow(c)}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground mt-2 text-[10px] leading-snug">
                Open Browse A–Z to scroll the full community directory.
              </p>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </>
  );
}
