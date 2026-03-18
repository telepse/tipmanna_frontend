/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";

// Third-party imports;
import { useSelector } from "react-redux";

// Local imports
import { sendMessageAction } from "@/actions/messages";
import { pusherClient } from "@/lib/pusher";
import { RootState } from "@/redux/store";
import { confettiStyle } from "@/animation-styles/confetti";
import { MessageHeader } from "./message-header";
import { ChatContainer } from "./chat-container";
import { Message, RoomCharacter } from "@/types";
import { popAndShootStyle } from "@/animation-styles/pop-and-shoot";
import { fallStyle } from "@/animation-styles/fall";
import { burstStyle } from "@/animation-styles/burst";
import { screenShakeStyle } from "@/animation-styles/screen-shake";
import { luxuriousStyle } from "@/lib/luxuriousStyle";
import { floatStyle } from "@/animation-styles/float";
import { useMediaQuery } from "react-responsive";
import { AnimationHandle } from "@/types/animation.types";
import { getEventId } from "@/lib/identity";
import {
  playedAnimations,
  wrapPaymentAnimation,
} from "@/lib/wrapPaymentAnimation";
import { spinStyle } from "@/animation-styles/spin";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { TipAnimationEvent } from "@/lib/animation-guard";

type FlyingTip = {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
};

interface Props {
  eventId: string;
  eventName: string;
  hostName: string;
  organizationName: string;
  initialMessages: Message[];
  tippingCharacters: RoomCharacter[];
  iTipped: number;
  channels: any[];
  frameId: string;
  isEventOwner: string;
  liveVideoLink: string;
}

export function wrapNonHandleAnimation(
  fn: () => void,
  durationMs: number
): AnimationHandle & { start: () => void } {
  let timeoutId: number | undefined;
  let started = false;
  let stopped = false;

  const finished = new Promise<void>(resolve => {
    timeoutId = window.setTimeout(() => {
      if (!stopped) resolve();
    }, durationMs);
  });

  return {
    start() {
      if (started) return;
      started = true;
      try {
        fn(); // Only trigger DOM changes here
      } catch (err) {
        console.error("Animation error:", err);
      }
    },
    stop() {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
    finished,
  };
}

export const RoomMessages = ({
  eventId,
  eventName,
  hostName,
  organizationName,
  initialMessages,
  tippingCharacters,
  iTipped,
  channels,
  frameId,
  isEventOwner,
  liveVideoLink,
}: Props) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const { selectedTips } = useSelector((state: RootState) => state.tip);
  const [flyingTips] = useState<FlyingTip[]>([]);

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  useEffect(() => {
    const container = document.getElementById("chat-container");
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { amount, sender, textTip, selectedTips } =
        customEvent.detail || {};
      if (!selectedTips || selectedTips.length === 0) return;
      if (!amount) return;

      // ✅ Compute purchasedSummary
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
        tip: `+£${amount}`,
        secondaryText: textTip || undefined,
      };

      // ✅ Save to backend using the server action
      sendMessageAction({
        eventId,
        sender: newMsg.sender,
        text: newMsg.text,
        tip: Number(amount),
        secondaryText: textTip || undefined,
        selectedTips,
        purchasedSummary,
      });
    };

    const channel = pusherClient.subscribe(`event-${eventId}`);
    const eventQueues = new Map<string, Promise<void>>();

    // ── Generation counter: incremented on tab wake to kill stale queue chains ──
    let generation = 0;

    function startPaymentAnimations(
      eventId: string,
      animations: (() => Promise<void>)[]
    ) {
      const capturedGeneration = generation;
      const previous = eventQueues.get(eventId) ?? Promise.resolve();

      const next = previous.then(async () => {
        for (const run of animations) {
          // If the generation advanced (tab woke), abandon the rest of this batch
          if (generation !== capturedGeneration) return;

          try {
            await run();
          } catch {
            // Never block the queue on animation failure
          }
        }
      });

      eventQueues.set(eventId, next);
    }

    const handleNewTip = (data: TipAnimationEvent) => {
      const eventId = getEventId();

      console.log("NEW TIP PAYLOAD", data);

      // Map selected tips to actual characters
      const selectedCharacters = data.selectedTips
        .map(name => tippingCharacters.find(c => c.name === name))
        .filter(Boolean) as RoomCharacter[];

      if (!selectedCharacters.length) return;

      const paymentAnimations: (() => Promise<void>)[] = [];

      // Deduplicate per style per tip
      for (const character of selectedCharacters) {
        const key = `${data.id}-${character.styleName}`; // unique identifier per tip + style

        // ✅ Skip if this animation has already been played globally
        if (playedAnimations.has(key)) continue;
        playedAnimations.add(key);

        // Push the corresponding animation
        switch (character.styleName) {
          case "Confetti":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                confettiStyle({ tips: [character.name], mode: "payment" })
              )
            );
            break;

          case "Pop and Shoot":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                popAndShootStyle({
                  icons: [character.iconUrl],
                  mode: "payment",
                })
              )
            );
            break;

          case "Burst":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                burstStyle({
                  icons: [character.iconUrl],
                  spread: 300,
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Float":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                floatStyle({
                  icons: [character.iconUrl],
                  mode: "payment",
                  duration: ANIMATION_DURATION.payment.default,
                })
              )
            );
            break;

          case "Screen Shake":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                screenShakeStyle({
                  icons: [character.iconUrl],
                  target: document.body,
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Luxurious":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                luxuriousStyle({
                  videos: ["/icons/crown.webm"],
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Fall":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                fallStyle({
                  icons: [character.iconUrl],
                  fallCount: 60,
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Spin":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                spinStyle({ icons: [character.iconUrl], mode: "payment" })
              )
            );
            break;

          default:
            console.warn(`Unknown style: ${character.styleName}`);
        }
      }

      // 🔒 Strict FIFO execution per event
      if (paymentAnimations.length > 0) {
        startPaymentAnimations(eventId, paymentAnimations);
      }
    };

    // ── Visibility flush: kill queued animations on tab wake ──
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        generation++;
        eventQueues.set(eventId, Promise.resolve());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const handleValidatedTip = (e: Event) => {
      const data = (e as CustomEvent<TipAnimationEvent>).detail;
      handleNewTip(data);
    };
    window.addEventListener("validated-tip", handleValidatedTip);

    channel.bind("new-message", (message: Message) => {
      const formattedMessage = {
        ...message,
        time:
          message.createdAt ||
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
      };
      setMessages(prev => [...prev, formattedMessage]);
    });

    window.addEventListener("tip:dropped", handler);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("tip:dropped", handler);
      channel.unbind("new-message");
      window.removeEventListener("validated-tip", handleValidatedTip);
      pusherClient.unsubscribe(`event-${eventId}`);
    };
  }, [eventId, tippingCharacters]);

  return (
    <div
      style={{
        backgroundImage: `url(/assets/tipmanna_web_message_section_image_background.png)`,
      }}
      className="flex-1 overflow-y-auto bg-cover bg-center bg-no-repeat px-4 py-1"
    >
      <div className="mini-wrapper section p-2 sm:p-4">
        <MessageHeader
          eventId={eventId}
          iTipped={iTipped}
          channels={channels}
          frameId={frameId}
          isEventOwner={isEventOwner}
          liveVideoLink={liveVideoLink}
        />

        <ChatContainer
          eventId={eventId}
          hostName={hostName}
          eventName={eventName}
          messages={messages}
          flyingTips={flyingTips}
          tippingCharacters={tippingCharacters}
          organizationName={organizationName}
        />
      </div>
    </div>
  );
};
