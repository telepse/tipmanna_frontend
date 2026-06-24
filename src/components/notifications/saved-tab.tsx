"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { getSavedVideosForTipper } from "@/actions/events";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TopContentCard } from "@/components/home/top-content-card";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { getAuthToken } from "@/lib/getAuthToken";
import {
  fetchSavedHostsMe,
  unsaveHostRequest,
  type SavedHostRow,
} from "@/lib/save-host-client";
import { normalizeSavedVideosList } from "@/lib/save-video-client";
import { cn } from "@/lib/utils";
import type { RootState } from "@/redux/store";

type SavedVideoItem = {
  id?: string;
  channelId?: string;
  channel?: {
    id?: string;
    url?: string;
    title?: string;
    durationSeconds?: number;
    event?: {
      id?: string;
      eventName?: string;
      eventBanner?: string;
      eventDate?: string;
      startTime?: string;
      endTime?: string;
      amountRaised?: number;
      numOfTips?: number;
      hostName?: string;
      host?: { username?: string; fullName?: string };
    };
  };
};

interface Props {
  savedContents?: SavedVideoItem[];
  savedHosts?: SavedHostRow[];
  loadingSaved?: boolean;
  /** When false, skip initial fetch (parent handles cache). */
  fetchOnMount?: boolean;
}

export function SavedTab({
  savedContents: savedContentsProp,
  savedHosts: savedHostsProp,
  loadingSaved = false,
  fetchOnMount = true,
}: Props) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [videos, setVideos] = useState<SavedVideoItem[]>(
    () => savedContentsProp ?? []
  );
  const [hosts, setHosts] = useState<SavedHostRow[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingHosts, setLoadingHosts] = useState(
    () => !savedHostsProp && fetchOnMount
  );
  const loadedRef = useRef(false);

  const loadVideos = useCallback(async () => {
    if (!isAuthenticated) {
      setVideos([]);
      return;
    }
    setLoadingVideos(true);
    const token = getAuthToken();
    const res = await getSavedVideosForTipper(token);
    setVideos(
      res.success
        ? (normalizeSavedVideosList(res.data) as SavedVideoItem[])
        : []
    );
    setLoadingVideos(false);
  }, [isAuthenticated]);

  const loadHosts = useCallback(async () => {
    if (!isAuthenticated) {
      setHosts([]);
      setLoadingHosts(false);
      return;
    }
    setLoadingHosts(true);
    const rows = await fetchSavedHostsMe();
    setHosts(rows);
    setLoadingHosts(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (savedHostsProp !== undefined) {
      setHosts(savedHostsProp);
      setLoadingHosts(false);
    }
  }, [savedHostsProp]);

  useEffect(() => {
    if (savedContentsProp !== undefined) {
      setVideos(savedContentsProp);
    }
  }, [savedContentsProp]);

  useEffect(() => {
    if (!fetchOnMount || loadedRef.current) return;
    if (!isAuthenticated) return;
    loadedRef.current = true;
    void loadVideos();
    void loadHosts();
  }, [fetchOnMount, isAuthenticated, loadHosts, loadVideos]);

  useEffect(() => {
    const onSaves = () => {
      void loadVideos();
    };
    window.addEventListener("tipmanna:saves-changed", onSaves);
    return () => window.removeEventListener("tipmanna:saves-changed", onSaves);
  }, [loadVideos]);

  const handleUnsaveHost = async (hostId: string) => {
    const ok = await unsaveHostRequest(hostId);
    if (!ok) {
      toast.error("Could not remove saved host");
      return;
    }
    toast.success("Host removed");
    void loadHosts();
  };

  const displayVideos =
    savedContentsProp !== undefined ? savedContentsProp : videos;

  return (
    <Tabs
      defaultValue="videos"
      className="px-2 pb-4"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="videos">Videos</TabsTrigger>
        <TabsTrigger value="hosts">Hosts</TabsTrigger>
      </TabsList>

      <TabsContent
        value="videos"
        forceMount
        className="mt-3 space-y-2 data-[state=inactive]:hidden"
      >
        {loadingVideos || loadingSaved ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border bg-gray-50 h-24"
              />
            ))}
          </div>
        ) : displayVideos.length === 0 ? (
          <p className="text-muted-foreground text-sm">No saved videos yet.</p>
        ) : (
          <div className="space-y-3 overflow-x-auto">
            {displayVideos.map((item, idx) => {
              const ch = item.channel;
              const ev = ch?.event;
              const host = ev?.host;
              const videoTitle = (ch?.title ?? "").trim();
              const eventTitle = (ev?.eventName ?? "").trim();
              const primaryTitle = videoTitle || eventTitle || "Untitled video";
              const eventSubtitle =
                videoTitle &&
                eventTitle &&
                videoTitle.toLowerCase() !== eventTitle.toLowerCase()
                  ? eventTitle
                  : undefined;
              const videoId = extractYoutubeID(ch?.url || "");

              return (
                <TopContentCard
                  key={item.id ?? ch?.id ?? idx}
                  channelId={ch?.id || ""}
                  roomId={ev?.id || ""}
                  eventBanner={
                    videoId
                      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                      : ev?.eventBanner || ""
                  }
                  eventName={primaryTitle}
                  eventSubtitle={eventSubtitle}
                  fullName={host?.fullName?.trim() || ev?.hostName || ""}
                  username={host?.username?.trim() || ev?.hostName || ""}
                  amountRaised={ev?.amountRaised ?? 0}
                  numOfTips={ev?.numOfTips ?? 0}
                  eventDate={(ev?.eventDate as string) || ""}
                  startTime={ev?.startTime || ""}
                  endTime={ev?.endTime || ""}
                  duration={ch?.durationSeconds ?? 0}
                />
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent
        value="hosts"
        forceMount
        className="mt-3 space-y-2 data-[state=inactive]:hidden"
      >
        {loadingHosts ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border bg-gray-50 h-14"
              />
            ))}
          </div>
        ) : hosts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No saved hosts yet.</p>
        ) : (
          <ul className="space-y-2">
            {hosts.map(row => {
              const host = row.host;
              const username = host?.username;
              const href = username ? `/host/${username}` : "#";
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <Link
                    href={href}
                    className={cn(
                      "min-w-0 flex-1",
                      !username && "pointer-events-none"
                    )}
                  >
                    <p className="truncate text-sm font-medium">
                      {host?.fullName ?? host?.username ?? "Host"}
                    </p>
                    {host?.username ? (
                      <p className="text-muted-foreground text-xs">
                        @{host.username}
                      </p>
                    ) : null}
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleUnsaveHost(row.hostId)}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
