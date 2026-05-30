"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { HostNotificationsClient } from "@/components/dashboard/host-notifications-client";

export default function HostNotificationsPage() {
  return (
    <ProtectedRoute>
      <HostNotificationsClient />
    </ProtectedRoute>
  );
}
