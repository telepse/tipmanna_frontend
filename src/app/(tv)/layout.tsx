/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getAllEventChannels } from "@/actions/events";
import { TVNavbar } from "@/components/tv/tv-navbar";
import { usePusherTrackingGlobalTV } from "@/hooks/use-global-viewer-count";
import { UserInfo } from "@/types/tracking.types";
import { useEffect, useState } from "react";
import { getOrCreateAnonymousViewer } from "@/lib/anonymous-viewer";
import { TvDeviceSessionBootstrap } from "@/components/tv/tv-device-session-bootstrap";

export default function TVLayout({ children }: { children: React.ReactNode }) {
  const [, setContents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: _contents } = await getAllEventChannels();

      setContents(_contents as any[]);
    };

    fetchData();
  }, []);

  const [currentUser, setCurrentUser] = useState<UserInfo>({
    id: "",
    type: "anonymous",
    username: "Anonymous",
    isAuthenticated: false,
  });

  useEffect(() => {
    setCurrentUser(getOrCreateAnonymousViewer());
  }, []);

  const { activeUsers } = usePusherTrackingGlobalTV({
    tvId: "global-tv", // or specific TV stream id
    userInfo: currentUser,
  });

  return (
    <>
      <TVNavbar active_users={activeUsers.length} />

      <>
        <TvDeviceSessionBootstrap />

        <main className="grid grid-cols-12 gap-8">
          <div className="col-span-full">{children}</div>
        </main>
      </>
    </>
  );
}
