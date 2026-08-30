import { ProtectedRoute } from "@/components/protected-route";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardClient />
    </ProtectedRoute>
  );
}
