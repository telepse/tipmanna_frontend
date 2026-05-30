"use client";

import { useState } from "react";
import { TipsDrawer } from "@/components/events/tips-drawer";

/** Isolated page for Playwright tips drawer scope toggle tests. */
export default function E2eTipsDrawerPage() {
  const [open, setOpen] = useState(true);

  return (
    <main className="min-h-screen bg-zinc-100">
      <TipsDrawer
        open={open}
        onOpenChange={setOpen}
        eventId="e2e-event-id"
        channelId="e2e-channel-id"
        eventRoomTipCount={0}
        videoTipCount={0}
      />
    </main>
  );
}
