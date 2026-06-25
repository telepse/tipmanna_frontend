import { ProtectedRoute } from "@/components/protected-route";
import { HostRevenuePayoutsClient } from "@/components/dashboard/host-revenue-payouts-client";

export default function HostRevenuePage() {
  return (
    <ProtectedRoute>
      <HostRevenuePayoutsClient />
    </ProtectedRoute>
  );
}
