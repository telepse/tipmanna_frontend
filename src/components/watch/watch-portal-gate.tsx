"use client";

import type { ReactNode } from "react";

import { isWatchPortalEnabled } from "@/lib/watch-portal-flag";

import { WatchPortalShell } from "./watch-portal-shell";
import { WatchUnavailable } from "./watch-unavailable";

export function WatchPortalGate({ children }: { children: ReactNode }) {
  if (!isWatchPortalEnabled()) {
    return <WatchUnavailable />;
  }
  return <WatchPortalShell>{children}</WatchPortalShell>;
}
