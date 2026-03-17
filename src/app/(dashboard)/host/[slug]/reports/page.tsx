import { ReportsClient } from "@/components/dashboard/reports-client";
import { ProtectedRoute } from "@/components/protected-route";

export default function ReportsAndAnalyticsPage() {
  return (
    <ProtectedRoute>
      <ReportsClient />
    </ProtectedRoute>
  );
}
