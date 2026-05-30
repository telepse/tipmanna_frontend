"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";

// Third-party imports
import { motion } from "framer-motion";
import { useSelector } from "react-redux";

// Local imports
import { cn, formatCurrency, formatUtcTime } from "@/lib/utils";
import { TipDisplay } from "./tip-display";
import { DropTip } from "./drop-tip";
import { RootState } from "@/redux/store";
import { Message, RoomCharacter } from "@/types";

type FlyingTip = {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
};

interface Props {
  eventId: string;
  hostName: string;
  eventName: string;
  organizationName: string;
  messages: Message[];
  flyingTips: FlyingTip[];
  tippingCharacters: RoomCharacter[];
}

export const ChatContainer = ({
  eventId,
  hostName,
  eventName,
  organizationName,
  messages,
  flyingTips,
  tippingCharacters,
}: Props) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { selectedTips, paymentCompleted } = useSelector(
    (state: RootState) => state.tip
  );

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const totalAmount = useMemo(() => {
    return selectedTips.reduce((acc, characterName) => {
      if (characterName === "Text") {
        return acc + 5;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);
  }, [selectedTips, tippingCharacters]);

  useEffect(() => {
    localStorage.setItem("amount", totalAmount.toString());
  }, [totalAmount]);

  return (
    <div className="bg-room-messages/50 relative -mt-6 space-y-4 rounded-br-2xl rounded-bl-2xl">
      {/* Host message */}
      <div className="flex max-w-[90%] flex-col items-start p-4 sm:max-w-[50%] sm:p-6 lg:max-w-[30%]">
        <div className="relative rounded-2xl rounded-tl-none bg-white p-4 text-sm text-black shadow-md">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2">
              <span className="text-xs font-semibold sm:text-sm">
                {hostName}
              </span>{" "}
              <span className="rounded-md bg-[#BCE6FF] px-1.5 py-0.5 text-xs">
                Host
              </span>
              <span className="text-muted-foreground text-[10px]">
                {formatUtcTime(new Date())}
              </span>
            </p>
            <p className="text-xs font-semibold">
              Welcome to {eventName} by {organizationName}
            </p>
          </div>
        </div>
      </div>

      {/* <div id="icon-shake-overlay" className="scoped"></div> */}

      {/* Chat messages */}
      {messages.map(msg => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "mr-4 flex max-w-[70%] flex-col",
            msg.role === "host" ? "items-start" : "ml-auto items-end"
          )}
        >
          <div
            className={cn(
              "relative rounded-2xl bg-white p-4 text-sm text-black shadow-md",
              msg.role === "host"
                ? "rounded-tl-none bg-white text-black"
                : "rounded-tr-none bg-[#fff] text-black"
            )}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold">{msg.sender}</p>

              {msg.role === "host" && (
                <span className="rounded-md bg-[#BCE6FF] px-1.5 py-0.5 text-xs">
                  Host
                </span>
              )}

              <span className="text-muted-foreground text-[10px]">
                {formatUtcTime(msg.createdAt)}
              </span>
            </div>

            <p>
              {msg.text}{" "}
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
            {msg.secondaryText && (
              <p className="text-xs">{msg.secondaryText}</p>
            )}
          </div>
        </motion.div>
      ))}

      <div id="popup-container" />

      <div id="preview-animation-root" />

      <div id="live-animation-root"></div>

      {/* Dummy div to scroll to */}

      {flyingTips.map((tip: FlyingTip) => (
        <motion.div
          key={tip.id}
          style={{
            position: "fixed",
            left: tip.startX,
            top: tip.startY,
            fontSize: "2rem",
            zIndex: 50,
            pointerEvents: "none",
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: 200 + Math.random() * 50, // up-right diagonal
            y: -200 - Math.random() * 50,
            opacity: 0,
          }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {tip.emoji}
        </motion.div>
      ))}

      {/* Funnel icon at bottom-left */}
      <div className="sticky bottom-14 left-0 z-[5]">
        <div
          id="tip-container"
          className="pointer-events-none fixed top-0 left-0 z-[9999] h-full w-full"
        ></div>
        <button
          id="funnel-btn"
          className="rounded-full p-3 text-white"
        >
          <Image
            src="/events/funnel.png"
            alt="Funnel"
            width={100}
            height={100}
            className="size-15 object-contain sm:size-20"
          />
        </button>
      </div>

      <div ref={messagesEndRef} />

      <div className="bg-room-messages sticky right-0 bottom-0 left-0 flex items-center justify-between gap-2 overflow-auto rounded-br-2xl rounded-bl-2xl border border-none p-1">
        <div className="flex h-8 flex-1 gap-2 overflow-x-hidden rounded-md bg-white p-1">
          <div className="flex gap-1">
            <span className="bg-room-messages flex flex-col items-center justify-center rounded-md p-2 text-xs text-white sm:text-sm">
              £{totalAmount}
            </span>
            {selectedTips.length > 0 && !paymentCompleted && (
              <div className="line-clamp-2 flex w-20 items-center justify-center overflow-hidden text-[12px] leading-3 font-medium sm:w-20 sm:text-[12px] lg:w-20">
                Pay to send
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center justify-center overflow-hidden">
            <TipDisplay />
          </div>
        </div>
      </div>

      <div className="hidden">
        <DropTip eventId={eventId} />
      </div>
    </div>
  );
};
