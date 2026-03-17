"use client";

import Link from "next/link";
import { useState } from "react";

// Third-party imports
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { ManageEventClient } from "@/components/events/manage-event-client";
import { CreateDialog } from "@/components/home/create-dialog";

export default function ManageEvent() {
  const [openPopup, setOpenPopup] = useState(false);

  return (
    <ProtectedRoute>
      {/* Heading */}
      <div className="flex flex-wrap justify-between gap-4">
        <DashboardHeading
          title="Manage Events"
          subtitle="View, edit, and track all your events in one place."
        />

        
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setOpenPopup(true)}
          >
            <Plus /> Create
          </Button>
      </div>

      <div className="space-y-6">
        <ManageEventClient />
      </div>

      <CreateDialog
          openPopup={openPopup}
          setOpenPopup={setOpenPopup}
        />
    </ProtectedRoute>
  );
}
