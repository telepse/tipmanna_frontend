import { Suspense } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import { CommunityDisplayHostClient } from "@/components/dashboard/community-display-host-client";

export default async function HostCommunityDisplayPage({
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
          <CommunityDisplayHostClient hostSlug={slug} />
        </div>
      </Suspense>
    </ProtectedRoute>
  );
}
