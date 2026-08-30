import { Suspense } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import { HostCommunityClient } from "@/components/dashboard/host-community-client";

export default function HostCommunityPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={<p className="text-muted-foreground p-4 text-sm">Loading…</p>}
      >
        <HostCommunityClient />
      </Suspense>
    </ProtectedRoute>
  );
}
