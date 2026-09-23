"use client";

import { useCallback, useState } from "react";

import { exploreCommunityJoinHref } from "@/lib/community-links";
import { navigateToCommunityPage } from "@/lib/explore-community-navigation";
import { useExploreCommunityNavigation } from "@/contexts/explore-community-navigation-context";
import type { SignupSurface } from "@/lib/signup-attribution";

type Options = {
  signupSurface?: SignupSurface;
  signInTitle?: string;
};

/** Join modal + Open community page for list/picker cards. */
export function useCommunityJoinFlow(options: Options = {}) {
  const signupSurface: SignupSurface =
    options.signupSurface ?? "community_picker";
  const { isOnExploreShell, openCommunityPageInExplore } =
    useExploreCommunityNavigation();

  const [joinCommunityId, setJoinCommunityId] = useState<string | null>(null);

  const openCommunity = useCallback(
    (communityId: string) => {
      const id = communityId.trim();
      if (!id) return;
      if (isOnExploreShell) {
        openCommunityPageInExplore(id);
        return;
      }
      navigateToCommunityPage(id);
    },
    [isOnExploreShell, openCommunityPageInExplore]
  );

  const openJoin = useCallback((communityId: string) => {
    const id = communityId.trim();
    if (!id) return;
    setJoinCommunityId(id);
  }, []);

  const closeJoinModal = useCallback(() => setJoinCommunityId(null), []);

  return {
    joinCommunityId,
    joinModalOpen: Boolean(joinCommunityId),
    closeJoinModal,
    openJoin,
    openCommunity,
    signInTitle: options.signInTitle ?? "Sign in to join this community",
    signupSurface,
    signInRedirectPath: joinCommunityId
      ? exploreCommunityJoinHref(joinCommunityId)
      : "",
  };
}
