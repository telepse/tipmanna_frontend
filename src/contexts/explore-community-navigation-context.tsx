"use client";

import { createContext, useContext } from "react";

export type ExploreCommunityNavigationContextValue = {
  /** True when rendered inside the Explore page shell. */
  isOnExploreShell: boolean;
  /** Atomically open community join tab without full page reload. */
  openCommunityPageInExplore: (communityId: string) => void;
};

const ExploreCommunityNavigationContext =
  createContext<ExploreCommunityNavigationContextValue>({
    isOnExploreShell: false,
    openCommunityPageInExplore: () => {},
  });

export function ExploreCommunityNavigationProvider({
  value,
  children,
}: {
  value: ExploreCommunityNavigationContextValue;
  children: React.ReactNode;
}) {
  return (
    <ExploreCommunityNavigationContext.Provider value={value}>
      {children}
    </ExploreCommunityNavigationContext.Provider>
  );
}

export function useExploreCommunityNavigation() {
  return useContext(ExploreCommunityNavigationContext);
}
