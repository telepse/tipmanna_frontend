"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { CommunitySendsClient } from "@/components/dashboard/community-sends-client";

export default function CommunitySendsPage() {
  return (
    <ProtectedRoute>
      <CommunitySendsClient />
    </ProtectedRoute>
  );
}
