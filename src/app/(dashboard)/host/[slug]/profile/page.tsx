import { HostProfileClient } from "@/components/dashboard/host-profile-client";
import { ProtectedRoute } from "@/components/protected-route";

export default function HostProfilePage() {
  return (
    <ProtectedRoute>
      <HostProfileClient />
    </ProtectedRoute>
  );
}
