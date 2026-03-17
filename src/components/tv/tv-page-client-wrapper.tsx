/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

// Third-party imports
import { useMediaQuery } from "react-responsive";
import {
  AudioLines,
  ChevronDown,
  ChevronsUp,
  UsersRound,
  Bookmark,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";

// Local imports
import { TVPageClient } from "@/components/tv/tv-page-client";
import { Channel } from "@/types/channel.types";
import { formatCurrency, trimTitle } from "@/lib/utils";
import { TipDrawer } from "../events/tip-drawer";
import Image from "next/image";
import { TVScheduleDrawer } from "./tv-schedule-drawer";
import { TvPlayerRef } from "./tv-player";
import { TvLooper } from "./tv-looper";
import { RootState } from "@/redux/store";
import { useSelector } from "react-redux";
import { getClientTokenFromPersist } from "@/lib/getClientToken";
import {
  getAllEventChannels,
  getAllTopTippers,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import {
  getLatestContents,
  getMostTippedContents,
  getTipFeed,
} from "@/actions/contents";
import { Content } from "@/types/content.types";

interface Message {
  id: string;
  sender: string;
  text: string;
  tip: number;
  purchasedSummary: string;
}

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
}

interface CharacterSet {
  id: string;
  name: string;
  characters: Character[];
}

interface Props {
  channels: Channel[];
  characters: Character[];
  characterSets: CharacterSet[];
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  {
    developerTools: { assistant: { enabled: false } },
  }
);

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONCERT_MUSIC: "Concert",
  DRAMA_ART: "Drama",
  FESTVAL: "Festival",
  CULTINERY: "Food",
  HANG_OUT: "Hangout",
  ISLAMIC: "Islamic",
  CHRISTIAN: "Christian",
  CORPORATE: "Corporate",
  COMEDY: "Comedy",
  FASHION: "Fashion",
  GAME_SPORT: "Game & Sport",
  OTHER: "Other",
};

export default function TVPageClientWrapper({
  channels,
  characters,
  characterSets,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const isMobile = useMediaQuery({ maxWidth: "500px" });

  const [activeTab, setActiveTab] = useState<"playlist" | "tips">("playlist");

  const handleSelectChannel = (index: number) => {
    setMode("LOCAL");
    setCurrentIndex(index);
  };

  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);

  const playerRef = useRef<TvPlayerRef>(null);

  const [, setDuration] = useState(0);
  const [, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!playerRef.current) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      const current = player.getCurrentTime();
      const total = player.getDuration();

      if (!isNaN(current)) setCurrentTime(current);
      if (!isNaN(total)) setDuration(total);
    }, 500);

    return () => clearInterval(interval);
  }, [currentIndex]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [broadcastEpoch, setBroadcastEpoch] = useState<number | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tv/schedule`
      );
      const data = await res.json();

      setItems(data.items);
      setTotalDuration(data.totalDuration);

      const drift = data.serverNow - Date.now();
      setBroadcastEpoch(data.broadcastEpoch - drift);
    };

    loadSchedule();
  }, []);

  const [isTVDrawerOpen, setIsTvDrawerOpen] = useState(false);

  const cursor = 0;

  useEffect(() => {
    window.dispatchEvent(new Event("tv-mounted"));
  }, []);

  const [mode, setMode] = useState<"GLOBAL" | "LOCAL">(() => {
    if (typeof window === "undefined") return "GLOBAL";
    return (localStorage.getItem("tv-mode") as any) || "GLOBAL";
  });

  useEffect(() => {
    localStorage.setItem("tv-mode", mode);
  }, [mode]);

  const displayedItems =
    mode === "GLOBAL"
      ? items
      : items.length > 0 && items[currentIndex]
        ? [items[currentIndex], ...items.filter((_, i) => i !== currentIndex)]
        : [];

  useEffect(() => {
    window.dispatchEvent(new Event("tv-page-open"));
  }, []);

  const { selectedTips } = useSelector((state: RootState) => state.tip);

  const totalAmount = selectedTips.reduce((acc: any, characterName: any) => {
    if (characterName === "Text") {
      return acc + 5;
    }
    const character = characters.find((c: any) => c.name === characterName);
    return acc + (character?.price || 0);
  }, 0);

  const options: StripeElementsOptions = {
    mode: "payment",
    amount: totalAmount * 100 || 100,
    currency: "gbp",
    appearance: {
      variables: {
        // spacingGridRow: "4px",
        // spacingGridColumn: "4px",
      },
    },
    fields: {
      billingDetails: {
        name: "never",
        email: "never",
        phone: "never",
        address: "never",
      },
    },
    syncAddressCheckbox: "none",
  } as unknown as StripeElementsOptions;

  const [tipFeed, setTipFeed] = useState<Message[]>([]);
  const [tippers, setTippers] = useState([]);
  const [tipperEvents, setTipperEvents] = useState([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState([]);
  const [contents, setContents] = useState([]);
  const [latestContents, setLatestContents] = useState([]);
  const [mostTippedContents, setMostTippedContents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = getClientTokenFromPersist();

      const [
        { data: _tippers },
        { data: _tipperEvents },
        { data: _iTipped },
        { data: _causes },
        { data: _contents },
        { data: _latestContents },
        { data: _mostTippedContents },
        { data: _tipFeed },
      ] = await Promise.all([
        getAllTopTippers(),
        getTippedEventsForTipper(token!),
        getTotalAmountTippedByTipper(token!),
        getAllCausesAction(),
        getAllEventChannels(),
        getLatestContents(),
        getMostTippedContents(),
        getTipFeed(),
      ]);

      setTippers(_tippers);
      setTipperEvents(_tipperEvents);
      setITipped(_iTipped);
      setCauses(_causes);
      setContents(_contents);
      setLatestContents(_latestContents);
      setMostTippedContents(_mostTippedContents);
      setTipFeed(_tipFeed);
    };

    fetchData();
  }, []);

  // console.log("items", items);
  // console.log("broadcastEpoch", broadcastEpoch);
  // console.log("totalDuration", totalDuration);

  const [selectedTag, setSelectedTag] = useState("");
  const [tagFilteredContents, setTagFilteredContents] = useState<any[]>([]);

  useEffect(() => {
    if (selectedTag) {
      setTagFilteredContents(
        contents.filter(
          (content: Content) =>
            content?.event.eventType?.toLowerCase() ===
            selectedTag.toLowerCase()
        )
      );
    } else {
      setTagFilteredContents([]);
    }
  }, [selectedTag, contents]);

  return (
    <>
      {!isMobile && (
        <TVPageClient
          channels={channels}
          currentPlayingIndex={currentIndex}
          contents={contents}
          tippers={tippers}
          tipperEvents={tipperEvents}
          iTipped={iTipped}
          causes={causes}
          latestContents={latestContents}
          mostTippedContents={mostTippedContents}
          selectedTag={selectedTag}
          tagFilteredContents={tagFilteredContents}
        />
      )}
      {isMobile && (
        <>
          <div className="-mt-4 -ml-4 flex h-full w-[330px] gap-4 p-0">
            {broadcastEpoch && items.length > 0 && totalDuration > 0 && (
              <TvLooper
                broadcastEpoch={broadcastEpoch}
                totalDuration={totalDuration}
                items={items}
                playerRef={playerRef}
                currentIndex={currentIndex}
                mode={mode}
              />
            )}
          </div>

          <div className="mt-4 -ml-4 flex w-full items-center gap-2">
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
              onClick={() => setMode("GLOBAL")}
              className={`text-sm whitespace-nowrap ${mode === "GLOBAL" ? "text-destructive underline" : ""}`}
            >
              Live TV
            </button>
            <button
              type="button"
              onClick={() => setMode("LOCAL")}
              className={`text-sm whitespace-nowrap ${mode === "LOCAL" ? "text-success underline" : ""}`}
            >
              Your TV
            </button>
          </div>

          {/* list of channels */}
          {activeTab === "playlist" && (
            <div className="flex max-h-[75vh] w-[330px] flex-col items-start gap-2 overflow-y-auto pb-10">
              <button
                type="button"
                onClick={() => setIsTvDrawerOpen(true)}
                className="mt-4 flex items-center gap-2 text-sm"
              >
                See full schedule <ArrowUp className="size-4" />
              </button>
              <div className="-ml-4 max-h-[35vh] w-[330px] space-y-4 overflow-y-auto p-4">
                {displayedItems
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((item, i) => {
                    const originalIndex = items.findIndex(
                      c => c.id === item.id
                    );

                    const isPlaying = originalIndex === currentIndex;

                    const start = new Date(
                      broadcastEpoch! + cursor * 1000
                    ).toLocaleTimeString();

                    return (
                      <div
                        key={i}
                        onClick={() => handleSelectChannel(i)}
                        className={`relative flex cursor-pointer items-center justify-between gap-4 rounded-md bg-white px-4 py-2 transition-all duration-300 ${isPlaying ? "ring-primary scale-100 shadow-lg ring-4" : "scale-100 ring-4 ring-gray-200"} `}
                      >
                        <div className="flex items-center gap-2">
                          {isPlaying && <Bookmark className="-ml-2 size-5" />}
                          <div className="space-y-1">
                            <h5 className="text-sm font-medium">
                              {item?.channel?.title
                                ? trimTitle(item.channel.title, 20)
                                : "Loading..."}
                            </h5>

                            <p className="text-muted-foreground text-[10px]">
                              Host:{" "}
                              {item?.channel?.title
                                ? trimTitle(item.channel.title, 20)
                                : "Loading..."}{" "}
                              <span className="text-primary text-[10px] opacity-50">
                                @{item.channel.username || ""}
                              </span>
                            </p>

                            {mode === "GLOBAL" && (
                              <p className="text-muted-foreground text-[10px]">
                                {start}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-end gap-1">
                          <span className="flex items-center gap-1 text-xs font-semibold">
                            <UsersRound className="size-4" />{" "}
                            <span className="whitespace-nowrap">
                              {item.channel.numOfTips || 0} tips
                            </span>
                          </span>

                          <p className="w-fit rounded-md bg-gray-200 px-1 py-0.5 text-[10px] text-black">
                            {EVENT_TYPE_LABELS[item.channel.eventType]}
                          </p>
                        </div>

                        {/* SAVE ICON */}
                        {isPlaying && (
                          <div className="absolute -top-4 -right-2 bg-white">
                            <span className="flex">
                              <AudioLines className="text-primary wave-icon" />
                              <AudioLines className="text-primary wave-icon" />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <TVScheduleDrawer
            isTVDrawerOpen={isTVDrawerOpen}
            setIsTvDrawerOpen={setIsTvDrawerOpen}
            broadcastEpoch={broadcastEpoch!}
            items={items}
            onSelectChannel={handleSelectChannel}
          />

          {/* tip feed */}
          {activeTab === "tips" && (
            <div className="-ml-6 max-h-[35vh] w-[330px] space-y-4 overflow-y-auto p-4">
              {tipFeed.map(msg => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between rounded-md bg-white p-2 text-black ring-4 ring-gray-200"
                >
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold">{msg.sender}</p>

                    <p>
                      {msg.text}
                      {msg.tip && (
                        <div className="bg-secondary inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold">
                          {formatCurrency(msg.tip)}
                        </div>
                      )}
                    </p>

                    {msg.purchasedSummary && (
                      <p className="text-muted-foreground text-xs">
                        {msg.purchasedSummary}
                      </p>
                    )}
                  </div>

                  <img
                    src={`https://img.youtube.com/vi/eW4PyI1JlFY/hqdefault.jpg`}
                    alt="video thumbnail"
                    className="h-[60px] w-[60px] shrink-0 rounded-md object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="fixed bottom-12 -ml-8 w-full rounded-tl-2xl rounded-tr-2xl border-4 border-gray-200 bg-white pt-2 pb-0.5 drop-shadow-lg">
            <Button
              size="lg"
              onClick={() => setIsTipDrawerOpen(true)}
              className="relative -mt-1 mb-2 flex h-6 w-full justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-sm text-black"
            >
              <Image
                src="/icons/love.png"
                alt="Love"
                width={10}
                height={10}
                className="size-5"
              />
              <Image
                src="/icons/star.png"
                alt="Star"
                width={10}
                height={10}
                className="size-5"
              />
              <ChevronsUp className="text-primary" />
              Tip or Donate <ChevronsUp className="text-primary" />{" "}
              <Image
                src="/icons/burger.png"
                alt="Burger"
                width={10}
                height={10}
                className="size-5"
              />
              <Image
                src="/icons/chicken.png"
                alt="Chicken"
                width={10}
                height={10}
                className="size-5"
              />
            </Button>
          </div>

          {/* Tip drawer */}
          <Elements
            stripe={stripePromise}
            options={options}
          >
            <TipDrawer
              open={isTipDrawerOpen}
              onOpenChange={setIsTipDrawerOpen}
              // eventId={eventId}
              tippingCharacters={characters}
              characterSets={characterSets}
            />
          </Elements>
        </>
      )}
    </>
  );
}
