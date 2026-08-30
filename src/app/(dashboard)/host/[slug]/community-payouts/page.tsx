import { ProtectedRoute } from "@/components/protected-route";
import { HostCommunityPayoutsClient } from "@/components/dashboard/host-community-payouts-client";

export default function HostCommunityPayoutsPage() {
  return (
    <ProtectedRoute>
      <HostCommunityPayoutsClient />
    </ProtectedRoute>
  );
}
