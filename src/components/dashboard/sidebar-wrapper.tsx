"use client";

import { useEffect, useState } from "react";

// Local imports
import { AppSidebar } from "@/components/app-sidebar";
import { getHostEventsAction } from "@/actions/events";
import { getClientTokenFromPersist } from "@/lib/getClientToken";

export function SidebarWrapper() {
  const [numOfEvents, setNumOfEvents] = useState(0);

  const token = getClientTokenFromPersist();

  useEffect(() => {
    async function loadEvents() {
      const { data: events } = await getHostEventsAction(token!);
      setNumOfEvents(events.length);
    }

    loadEvents();
  }, [token]);

  return <AppSidebar numOfEvents={numOfEvents} />;
}
