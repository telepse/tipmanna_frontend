/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getAllEventChannels } from "@/actions/events";
import { TVNavbar } from "@/components/tv/tv-navbar";
import { TVRightSection } from "@/components/tv/tv-right-section";
import { TVSidebar } from "@/components/tv/tv-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePusherTracking } from "@/hooks/use-pusher-tracking";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";

export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("currentUser");
  if (saved) return JSON.parse(saved);

  const newUser = {
    id: `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: "anonymous" as const,
    username: "Anonymous User",
    isAuthenticated: false,
  };
  localStorage.setItem("currentUser", JSON.stringify(newUser));
  return newUser;
};

export default function TVLayout({ children }: { children: React.ReactNode }) {
  const [currentUser] = useState(getCurrentUser);
  const [currentActivity, setCurrentActivity] = useState("viewing_event");

  // Initialize Pusher tracking
  const { activeUsers, trackActivity, leaveEvent } = usePusherTracking({
    eventId: "",
    userInfo: currentUser,
  });

  // const active_users = activeUsers.length;
  const active_users = Array.isArray(activeUsers) ? activeUsers.length : 0;

  // Track initial page view and set up activity tracking
  useEffect(() => {
    trackActivity("viewing_event");

    // Track when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        trackActivity(currentActivity);
      } else {
        trackActivity("background_tab");
      }
    };

    // Track page unload
    const handleBeforeUnload = () => {
      // The leave event is handled automatically in the hook cleanup
      trackActivity("leaving_event");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Tell backend user left
      leaveEvent();
    };
  }, [trackActivity, currentActivity, leaveEvent]);

  // Handle activity changes
  const handleActivityChange = (activity: string) => {
    setCurrentActivity(activity);
    trackActivity(activity);
  };

  const isMobile = useMediaQuery({ query: "(max-width: 500px)" });

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [contents, setContents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: _contents } = await getAllEventChannels();

      setContents(_contents);
    };

    fetchData();
  }, []);

  const tagFilteredContents = selectedTag
    ? contents.filter(
        content =>
          content.event.eventType?.toLowerCase() === selectedTag.toLowerCase()
      )
    : contents;

  return (
    <>
      <TVNavbar active_users={active_users} />

      <SidebarProvider>
        <TVSidebar
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          tagFilteredContents={tagFilteredContents}
        />
        <main className="grid grid-cols-12 gap-8">
          <div className="col-span-7">{children}</div>

          <div className="col-span-none md:col-span-5">
            {!isMobile && <TVRightSection />}
          </div>
        </main>
      </SidebarProvider>
    </>
  );
}
