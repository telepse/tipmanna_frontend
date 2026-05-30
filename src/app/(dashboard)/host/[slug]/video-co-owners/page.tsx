import { HostVideoCoOwnersClient } from "@/components/dashboard/host-video-co-owners-client";
import { ProtectedRoute } from "@/components/protected-route";

export default function HostVideoCoOwnersPage() {
  return (
    <ProtectedRoute>
      <HostVideoCoOwnersClient />
    </ProtectedRoute>
  );
}
