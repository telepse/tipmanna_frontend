import { Suspense } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import { CommunityCustomizationHostClient } from "@/components/dashboard/community-customization-host-client";

export default async function HostCommunityCustomizationPage({
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
          <CommunityCustomizationHostClient hostSlug={slug} />
        </div>
      </Suspense>
    </ProtectedRoute>
  );
}
