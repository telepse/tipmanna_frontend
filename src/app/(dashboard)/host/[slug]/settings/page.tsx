import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { SettingsClient } from "@/components/dashboard/settings-client";
import { ProtectedRoute } from "@/components/protected-route";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <section className="flex flex-col gap-6">
        <DashboardHeading
          title="Settings"
          subtitle="Manage your host dashboard preferences"
        />

        <SettingsClient />
      </section>
    </ProtectedRoute>
  );
}
