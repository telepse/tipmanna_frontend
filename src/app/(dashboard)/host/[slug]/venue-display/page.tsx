import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { ProtectedRoute } from "@/components/protected-route";
import { VenueDisplayClient } from "@/components/dashboard/venue-display-client";

export default function VenueDisplayPage() {
  return (
    <ProtectedRoute>
      <DashboardHeading
        title="Venue Display"
        subtitle="View venue display on dashboard..."
      />

      <div className="space-y-6">
        <VenueDisplayClient />
      </div>
    </ProtectedRoute>
  );
}
