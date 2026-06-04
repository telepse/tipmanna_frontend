"use client";

import { useEffect, useState } from "react";

// Local imports
import { getAllEventChannels } from "@/actions/events";
import { TVNavbar } from "@/components/tv/tv-navbar";
import { usePusherTrackingGlobalTV } from "@/hooks/use-global-viewer-count";
import { UserInfo } from "@/types/tracking.types";
import { getOrCreateAnonymousViewer } from "@/lib/anonymous-viewer";
import { TvDeviceSessionBootstrap } from "@/components/tv/tv-device-session-bootstrap";
import TVProvider from "@/components/tv-provider";
import { TVExpressButtons } from "@/components/tv/tv-express-buttons";

export default function TVLayout({ children }: { children: React.ReactNode }) {
  const [, setContents] = useState<unknown[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: _contents } = await getAllEventChannels();

      setContents(Array.isArray(_contents) ? _contents : []);
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
    <TVProvider>
      <>
        <TVNavbar active_users={activeUsers.length} />
        <TVExpressButtons />

        <>
          <TvDeviceSessionBootstrap />

          <main className="grid grid-cols-12 gap-8">
            <div className="col-span-full">{children}</div>
          </main>
        </>
      </>
    </TVProvider>
  );
}
