import { HostPremiumClient } from "@/components/dashboard/host-premium-client";
import { ProtectedRoute } from "@/components/protected-route";

export default function HostPremiumPage() {
  return (
    <ProtectedRoute>
      <HostPremiumClient />
    </ProtectedRoute>
  );
}
