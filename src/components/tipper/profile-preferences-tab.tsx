"use client";

import { HostNotificationPreferences } from "@/components/dashboard/host-notification-preferences";

export function ProfilePreferencesTab() {
  return (
    <div className="max-h-[200px] space-y-4 overflow-y-scroll p-4">
      <h2 className="text-lg font-semibold">Notification preferences</h2>
      <HostNotificationPreferences />
    </div>
  );
}
