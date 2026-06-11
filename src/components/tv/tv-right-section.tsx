"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ArrowUp, ChevronDown, LinkedinIcon, Tv } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { TvLooper } from "./tv-looper";
import { TVScheduleDrawer } from "./tv-schedule-drawer";
import { TvPlaylistPreview } from "./tv-playlist-preview";
import { useTV } from "../tv-provider";
import { usePusherTrackingGlobalTV } from "@/hooks/use-global-viewer-count";
import { UserInfo } from "@/types/tracking.types";
import { getOrCreateAnonymousViewer } from "@/lib/anonymous-viewer";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { getTipFeed } from "@/actions/contents";
import { getCharactersForTipping } from "@/actions/characters";
import { Message, RoomCharacter } from "@/types";
import { LinkedinShareButton, TwitterShareButton } from "next-share";
import { TwitterIcon } from "lucide-react";
import { WhatsappShareButton, WhatsappIcon } from "next-share";

export const TVRightSection = () => {
  const [currentUser] = useState<UserInfo>(() => getOrCreateAnonymousViewer());

  const { activeUsers } = usePusherTrackingGlobalTV({
    tvId: "global-tv", // or specific TV stream id
    userInfo: currentUser,
  });

  const {
    items,
    totalDuration,
    mode,
    isReady: tvReady,
    goLive,
    playLocal,
    switchToLocal,
    scheduleError,
    scheduleStale,
    retryScheduleLoad,
  } = useTV();

  const handleSelectChannel = (index: number) => {
    playLocal(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [activeTab, setActiveTab] = useState<"playlist" | "tips">("playlist");
  const [isTvDrawerOpen, setIsTvDrawerOpen] = useState(false);

  const [tipFeed, setTipFeed] = useState<Message[]>([]);
  const [characters, setCharacters] = useState<RoomCharacter[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: _tipFeed }, { data: _characters }] = await Promise.all([
        getTipFeed(),
        getCharactersForTipping(),
      ]);

      setTipFeed(_tipFeed as Message[]);
      if (_characters) setCharacters(_characters as RoomCharacter[]);
    };

    fetchData();
  }, []);

  const shareUrl = getPublicAbsoluteUrl("/tv");
  const shareTitle = "Join me on TipManna TV";

  const [showShare, setShowShare] = useState(false);

  const handleToggle = () => {
    setShowShare(prev => !prev);
  };

  const scrollRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(10);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll =
      (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight;

    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }

    const progress = (((el as HTMLElement).scrollTop || 0) / maxScroll) * 100;
    setScrollProgress(progress);
  };

  return (
    <div className="bg-gray fixed z-[100] h-fit w-full space-y-4 p-4">
      <div className="flex w-[400px] items-center justify-between">
        <span className="ml-[40px] flex items-center gap-1 font-medium">
          Live <Tv className="size-5" />
        </span>

        <div className="relative flex items-center justify-end gap-3">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4"></span>{" "}
            <span className="text-xs">
              <span>{activeUsers.length} online</span>
            </span>
          </div>

          <div className="relative -mt-1 -mr-4 inline-block w-full">
            <span
              className="border-b-2 border-black text-xs"
              onClick={handleToggle}
            >
              Share TV
            </span>

            {showShare && (
              <div className="absolute top-8 right-full z-[100] mt-2 h-[50px] w-[250px] rounded-md border bg-white p-1 shadow-md">
                <WhatsappShareButton
                  url={shareUrl}
                  title={shareTitle}
                >
                  <WhatsappIcon
                    size={32}
                    round
                  />
                </WhatsappShareButton>

                <LinkedinShareButton
                  url={shareUrl}
                  summary={shareTitle}
                >
                  <LinkedinIcon size={32} />
                </LinkedinShareButton>
                <TwitterShareButton
                  url={shareUrl}
                  title={shareTitle}
                >
                  <TwitterIcon
                    size={32}
                    className="rounded-full"
                  />
                </TwitterShareButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {scheduleStale && tvReady && (
        <div className="mb-2 w-[400px] rounded-md border border-amber-600 bg-amber-50 p-4 text-sm text-black">
          <p className="font-medium">
            Using a cached TV schedule (offline or server error).
          </p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => retryScheduleLoad()}
          >
            Retry fresh load
          </button>
        </div>
      )}
      {scheduleError && !tvReady && (
        <div className="border-destructive mb-2 w-[400px] rounded-md border bg-white p-4 text-sm text-black">
          <p className="font-medium">Unable to load the TV schedule.</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => retryScheduleLoad()}
          >
            Retry
          </button>
        </div>
      )}

      {tvReady && items.length > 0 && totalDuration > 0 && (
        <TvLooper characters={characters} />
      )}

      <div className="mt-4 flex w-[500px] items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("playlist")}
          className={`break-words-none flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
            activeTab === "playlist"
              ? "bg-black text-white"
              : "bg-white text-black outline-black"
          }`}
        >
          TV Playlist <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tips")}
          className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
            activeTab === "tips"
              ? "bg-black text-white"
              : "bg-white text-black outline-black"
          }`}
        >
          Tips <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={goLive}
          className={`text-sm whitespace-nowrap ${mode === "GLOBAL" ? "text-destructive underline" : ""}`}
        >
          Live TV
        </button>
        <button
          type="button"
          onClick={switchToLocal}
          className={`text-sm whitespace-nowrap ${mode === "LOCAL" ? "text-success underline" : ""}`}
        >
          Your TV
        </button>
      </div>

      {activeTab === "playlist" && (
        <div className="flex max-h-[75vh] w-full flex-col items-start gap-2 overflow-y-auto pb-10">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="custom-scrollbar -ml-4 h-[30vh] max-h-[35vh] w-[440px] space-y-4 overflow-y-auto p-4"
            >
              <div className="w-full max-w-[440px] space-y-4">
                <TvPlaylistPreview
                  layout="desktop"
                  onSelectChannel={handleSelectChannel}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsTvDrawerOpen(true)}
                className="mt-4 flex items-center gap-2 text-sm"
              >
                See full schedule <ArrowUp className="size-4" />
              </button>
            </div>

            <div className="absolute top-0 right-1 flex h-full w-2 justify-center">
              <div className="relative h-full w-[2px] bg-gray-200">
                <div
                  className="bg-primary absolute left-1/2 size-2 -translate-x-1/2 rounded-full transition-transform"
                  style={{
                    top: `${scrollProgress}%`,
                    transform: `translate(-50%, -50%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tips" && (
        <div className="custom-scrollbar -mt-4 -ml-4 max-h-[35vh] w-[440px] space-y-4 overflow-y-auto p-4">
          {tipFeed.map(msg => (
            <div
              key={msg.id}
              className="flex items-center justify-between rounded-md bg-white p-2 text-black ring-4 ring-gray-200"
            >
              <div className="flex flex-col">
                <p className="text-xs font-semibold">{msg.sender}</p>

                <p className="text-sm">
                  {msg.text}
                  {msg.tip && (
                    <span className="bg-secondary inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold">
                      {formatCurrency(msg.tip)}
                    </span>
                  )}
                </p>

                {msg.purchasedSummary && (
                  <p className="text-muted-foreground text-xs">
                    {msg.purchasedSummary}
                  </p>
                )}
              </div>

              <Link href={`/channel/${msg.event.id}`}>
                <img
                  src={`https://img.youtube.com/vi/eW4PyI1JlFY/hqdefault.jpg`}
                  alt="video thumbnail"
                  className="h-[60px] w-[60px] shrink-0 rounded-md object-cover"
                />
              </Link>
            </div>
          ))}
        </div>
      )}

      <TVScheduleDrawer
        isTVDrawerOpen={isTvDrawerOpen}
        setIsTvDrawerOpen={setIsTvDrawerOpen}
      />
    </div>
  );
};
