import type { ReactNode } from "react";

import { WatchPortalGate } from "@/components/watch/watch-portal-gate";

export default function WatchRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WatchPortalGate>{children}</WatchPortalGate>;
}
