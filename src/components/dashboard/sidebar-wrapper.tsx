"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { AppSidebar } from "@/components/app-sidebar";
import { getHostEventsAction } from "@/actions/events";
import type { RootState } from "@/redux/store";

export function SidebarWrapper() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [numOfEvents, setNumOfEvents] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setNumOfEvents(0);
      return;
    }

    async function loadEvents() {
      const { data: events } = await getHostEventsAction();
      setNumOfEvents(Array.isArray(events) ? events.length : 0);
    }

    void loadEvents();
  }, [user?.id]);

  return <AppSidebar numOfEvents={numOfEvents} />;
}
