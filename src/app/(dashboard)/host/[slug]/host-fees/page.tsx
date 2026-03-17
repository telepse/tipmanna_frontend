import { HostFeesClient } from "@/components/dashboard/host-fees-client";
import { ProtectedRoute } from "@/components/protected-route";

export default function HostFeesPage() {
  return (
    <ProtectedRoute>
      <HostFeesClient />
    </ProtectedRoute>
  );
}
