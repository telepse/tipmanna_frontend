import { Suspense } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import { CommunityTvHostClient } from "@/components/dashboard/community-tv-host-client";

export default async function HostCommunityTvPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ProtectedRoute>
      <Suspense
        fallback={<p className="text-muted-foreground p-4 text-sm">Loading…</p>}
      >
        <div className="p-4">
          <CommunityTvHostClient hostSlug={slug} />
        </div>
      </Suspense>
    </ProtectedRoute>
  );
}
