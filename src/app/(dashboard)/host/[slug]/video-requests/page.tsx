"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { HostVideoRequestsClient } from "@/components/dashboard/host-video-requests-client";

export default function HostVideoRequestsPage() {
  return (
    <ProtectedRoute>
      <HostVideoRequestsClient />
    </ProtectedRoute>
  );
}
