"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ProtectedRoute } from "@/components/protected-route";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { ManageEventClient } from "@/components/events/manage-event-client";
import { CoOwnerSelfPayoutsSection } from "@/components/co-owner/co-owner-self-payouts-section";
import { CreateDialog } from "@/components/home/create-dialog";
import { useTipLinkDashboardCreate } from "@/hooks/use-tip-link-dashboard-create";
import { TipLinkCreatePickerDialog } from "@/components/tiplink/tiplink-create-picker-dialog";
import { useHostSession } from "@/hooks/use-host-session";
import { HostDashboardShortcutsRow } from "@/components/dashboard/host-dashboard-shortcuts-row";

export default function ManageEvent() {
  const [openPopup, setOpenPopup] = useState(false);
  const params = useParams();
  const paramSlug =
    typeof params.slug === "string" ? params.slug : (params.slug?.[0] ?? null);
  const { eventSlug: sessionSlug } = useHostSession();
  const hostEventSlug = paramSlug ?? sessionSlug ?? null;

  const {
    pickerOpen,
    setPickerOpen,
    eligibleEvents,
    communityBankVideos,
    creatingChannelId,
    openPicker,
    createDraftForVideo,
    HostAuthModal,
    SubscriptionPromptModal,
    pickerDataLoading,
    pickerDataError,
  } = useTipLinkDashboardCreate(hostEventSlug);

  return (
    <ProtectedRoute>
      <div className="flex flex-wrap justify-between gap-4">
        <DashboardHeading
          title="Manage Events"
          subtitle="View, edit, and track all your events in one place."
        />

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <HostDashboardShortcutsRow hostEventSlug={hostEventSlug} />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="w-full bg-black hover:bg-black/80 sm:w-auto"
              onClick={() => openPicker()}
            >
              Tiplink
            </Button>

            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setOpenPopup(true)}
            >
              <Plus />
              Create
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <CoOwnerSelfPayoutsSection />
        <ManageEventClient />
      </div>

      <CreateDialog
        openPopup={openPopup}
        setOpenPopup={setOpenPopup}
      />

      <TipLinkCreatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        events={eligibleEvents}
        communityVideos={communityBankVideos}
        creatingChannelId={creatingChannelId}
        onSelect={createDraftForVideo}
        loading={pickerDataLoading}
        error={pickerDataError}
      />

      {HostAuthModal}
      {SubscriptionPromptModal}
    </ProtectedRoute>
  );
}
