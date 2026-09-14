"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

import { exploreCommunityJoinHref } from "@/lib/community-links";
import { navigateToCommunityPage } from "@/lib/explore-community-navigation";
import { useExploreCommunityNavigation } from "@/contexts/explore-community-navigation-context";
import type { SignupSurface } from "@/lib/signup-attribution";
import type { RootState } from "@/redux/store";

type Options = {
  signupSurface?: SignupSurface;
  signInTitle?: string;
};

/** Join modal + sign-in + Open community page for list/picker cards. */
export function useCommunityJoinFlow(options: Options = {}) {
  const signupSurface: SignupSurface =
    options.signupSurface ?? "community_picker";
  const router = useRouter();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const { isOnExploreShell, openCommunityPageInExplore } =
    useExploreCommunityNavigation();

  const [joinCommunityId, setJoinCommunityId] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReturnTo, setSignInReturnTo] = useState("");

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

  const openJoin = useCallback(
    (communityId: string) => {
      const id = communityId.trim();
      if (!id) return;
      if (!isAuthenticated) {
        setSignInReturnTo(exploreCommunityJoinHref(id));
        setSignInOpen(true);
        return;
      }
      setJoinCommunityId(id);
    },
    [isAuthenticated]
  );

  const closeJoinModal = useCallback(() => setJoinCommunityId(null), []);

  const onSignInVerified = useCallback(() => {
    if (signInReturnTo) {
      router.push(signInReturnTo);
    }
  }, [router, signInReturnTo]);

  return {
    joinCommunityId,
    joinModalOpen: Boolean(joinCommunityId),
    closeJoinModal,
    openJoin,
    openCommunity,
    signInOpen,
    setSignInOpen,
    signInReturnTo,
    onSignInVerified,
    signInTitle: options.signInTitle ?? "Sign in to join this community",
    signupSurface,
  };
}
