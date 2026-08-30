"use client";

import { useEffect, useMemo } from "react";

// Third-party imports
import { useSelector } from "react-redux";

// Local imports
import { RootState } from "@/redux/store";
import { RoomCharacter } from "@/types";
import { TipDisplay } from "./tip-display";
import { DropTip } from "./drop-tip";

interface Props {
  eventId: string;
  tippingCharacters: RoomCharacter[];
}

export const MessageFooter = ({ eventId, tippingCharacters }: Props) => {
  const { selectedTips } = useSelector((state: RootState) => state.tip);

  const totalAmount = useMemo(() => {
    return selectedTips.reduce((acc, characterName) => {
      if (characterName === "Comment") {
        return acc + 5;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);
  }, [selectedTips, tippingCharacters]);

  useEffect(() => {
    const amount = selectedTips.reduce((acc, characterName) => {
      if (characterName === "Comment") {
        return acc + 5;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);

    localStorage.setItem("amount", amount.toString());
  }, [totalAmount, selectedTips, tippingCharacters]);

  return (
    <div className="eventId fixed bottom-0 left-0 flex items-center justify-between gap-2 overflow-auto rounded-br-2xl rounded-bl-2xl border border-none bg-[#504326] p-1">
      <div className="flex h-8 flex-1 overflow-auto rounded-md bg-white p-1">
        <div className="bg-room-messages flex flex-col items-center justify-center rounded-md p-2 text-sm font-semibold text-white">
          £{totalAmount}
        </div>

        <TipDisplay />
      </div>

      <DropTip eventId={eventId} />
    </div>
  );
};
