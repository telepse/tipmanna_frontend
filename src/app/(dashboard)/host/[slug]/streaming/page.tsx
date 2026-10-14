import { Suspense } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import { HostStreamingDashboardClient } from "@/components/host/host-streaming-dashboard-client";

export default async function HostStreamingPage({
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
        <HostStreamingDashboardClient hostSlug={slug} />
      </Suspense>
    </ProtectedRoute>
  );
}
