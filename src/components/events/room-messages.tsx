/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  SetStateAction,
  Dispatch,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { sendMessageAction } from "@/actions/messages";
import { MessageHeader } from "./message-header";
import { ChatContainer } from "./chat-container";
import { Message, RoomCharacter } from "@/types";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { TipAnimationEvent } from "@/lib/animation-guard";
import { animLog } from "@/lib/animationDebug";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import { clearPendingTipBroadcast } from "@/lib/payment-origin";
import { useAnimationQueue } from "@/hooks/use-animation-queue";
import { Pin } from "lucide-react";

interface Performer {
  id: string;
  name: string;
  amountReceived: number;
}

interface Props {
  eventId: string;
  eventName: string;
  hostName: string;
  organizationName: string;
  messages: Message[];
  setMessages?: Dispatch<SetStateAction<Message[]>>;
  tippingCharacters: RoomCharacter[];
  iTipped: number;
  channels: EventRoomVideoChannel[];
  frameId: string;
  isEventOwner: string;
  liveVideoLink: string;
  performers: any[];
  projects: any[];
  contributionType: string;
  eventEventType?: string;
}

export const RoomMessages = ({
  eventId,
  eventName,
  hostName,
  organizationName,
  messages,
  tippingCharacters,
  iTipped,
  channels,
  frameId,
  isEventOwner,
  liveVideoLink,
  performers,
  projects,
  contributionType,
  eventEventType,
}: Props) => {
  const safeTippingCharacters = useMemo(
    () => (Array.isArray(tippingCharacters) ? tippingCharacters : []),
    [tippingCharacters]
  );
  const safePerformers = Array.isArray(performers) ? performers : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeChannels = Array.isArray(channels) ? channels : [];

  const { enqueue } = useAnimationQueue({
    eventId,
    surface: "room_messages",
  });

  const characterMap = useMemo(() => {
    const map = new Map<string, RoomCharacter>();
    for (const c of safeTippingCharacters) {
      if (c?.name) map.set(c.name, c);
    }
    return map;
  }, [safeTippingCharacters]);

  const characterMapRef = useRef(characterMap);
  characterMapRef.current = characterMap;

  useEffect(() => {
    const container = document.getElementById("chat-container");
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const {
        amount,
        sender,
        textTip,
        selectedTips,
        transactionId,
        eventChannelId,
      } = customEvent.detail || {};
      if (!selectedTips || selectedTips.length === 0) return;
      if (!amount) return;

      const correlatedTransactionId =
        typeof transactionId === "string" && transactionId.trim()
          ? transactionId.trim()
          : undefined;
      const correlatedEventChannelId =
        typeof eventChannelId === "string" && eventChannelId.trim()
          ? eventChannelId.trim()
          : undefined;

      if (correlatedTransactionId) {
        tracePaymentAnimation({
          stage: "create_message_request_correlated",
          surface: "room_messages",
          eventId,
          transactionId: correlatedTransactionId,
          transactionCorrelation: "present",
        });
      }

      const tipCounts: Record<string, number> = {};
      selectedTips.forEach((tip: string) => {
        tipCounts[tip] = (tipCounts[tip] || 0) + 1;
      });
      const purchasedSummary = Object.entries(tipCounts)
        .map(([name, qty]) => `${qty} ${name}`)
        .join(", ");

      const newMsg = {
        id: Date.now().toString(),
        sender: sender || "Anonymous",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: "I just sent",
        tip: `+£${amount.toFixed(2)}`,
        secondaryText: textTip || undefined,
      };

      sendMessageAction({
        eventId,
        sender: newMsg.sender,
        text: newMsg.text,
        tip: Number(amount),
        secondaryText: textTip || undefined,
        selectedTips,
        purchasedSummary,
        ...(correlatedEventChannelId
          ? { eventChannelId: correlatedEventChannelId }
          : {}),
        ...(correlatedTransactionId
          ? { transactionId: correlatedTransactionId }
          : {}),
      });

      if (correlatedTransactionId) {
        clearPendingTipBroadcast();
      }
    };

    const handleNewTip = (data: TipAnimationEvent) => {
      tracePaymentAnimation({
        stage: "validated_tip_listener_received",
        surface: "room_messages",
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
      });
      animLog("[RoomMessages] validated-tip received", {
        id: data.id,
        seq: data.seq,
        styles: data.selectedTips,
      });

      animLog("NEW TIP PAYLOAD", data);

      const dedupeKeyBase = data.id ?? `${data.eventId}-${data.serverTs}`;
      void import("@/lib/run-payment-bundle-animations").then(
        ({ enqueuePaymentBundleForValidatedTip }) => {
          enqueuePaymentBundleForValidatedTip({
            data,
            characterMap: characterMapRef.current,
            buildDedupeKey: name => `${dedupeKeyBase}-${name}`,
            enqueue,
            surface: "room_messages",
          });
        }
      );

      animLog("[RoomMessages] queuing payment bundle");
    };

    const handleValidatedTip = (e: Event) => {
      const data = (e as CustomEvent<TipAnimationEvent>).detail;
      handleNewTip(data);
    };
    window.addEventListener("validated-tip", handleValidatedTip);

    window.addEventListener("tip:dropped", handler);

    return () => {
      window.removeEventListener("tip:dropped", handler);
      window.removeEventListener("validated-tip", handleValidatedTip);
    };
  }, [eventId, enqueue]);

  const [showPinnedPerformers, setShowPinnedPerformers] = useState(false);

  return (
    <div
      className="relative flex-1 overflow-y-auto bg-cover bg-center bg-no-repeat px-4 py-1"
      style={{
        backgroundImage: `url(/assets/tipmanna_web_message_section_image_background.png)`,
      }}
    >
      <div className="mini-wrapper section relative z-0 p-2 sm:p-4">
        <MessageHeader
          eventId={eventId}
          iTipped={iTipped}
          channels={safeChannels}
          frameId={frameId}
          isEventOwner={isEventOwner}
          liveVideoLink={liveVideoLink}
          performers={safePerformers}
          projects={safeProjects}
          contributionType={contributionType}
          eventEventType={eventEventType}
        />

        {safePerformers.length > 0 && (
          <div className="-mt-6 flex items-center justify-between bg-white/20 px-4 py-1">
            <div />

            <div className="relative">
              <button
                type="button"
                className="rounded-md focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                aria-label={
                  showPinnedPerformers
                    ? "Hide pinned performers summary"
                    : "Show pinned performers summary"
                }
                onClick={() => setShowPinnedPerformers(prev => !prev)}
              >
                <Pin className="size-5 cursor-pointer text-white opacity-50" />
              </button>

              {showPinnedPerformers && (
                <div className="absolute top-6 right-0 z-50 flex h-[50px] w-[120px] items-center justify-center gap-4 bg-black/70">
                  {safePerformers.map((performer: Performer) => (
                    <div
                      key={performer.id}
                      className="text-xs text-white"
                    >
                      <span className="text-white/80">{performer.name}</span> £
                      {performer.amountReceived ?? 0}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <ChatContainer
          eventId={eventId}
          hostName={hostName}
          eventName={eventName}
          messages={messages}
          flyingTips={[]}
          tippingCharacters={safeTippingCharacters}
          organizationName={organizationName}
        />
      </div>
    </div>
  );
};
