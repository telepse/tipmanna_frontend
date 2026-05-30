"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { HostCommunityClient } from "@/components/dashboard/host-community-client";

export default function HostCommunityPage() {
  return (
    <ProtectedRoute>
      <HostCommunityClient />
    </ProtectedRoute>
  );
}
