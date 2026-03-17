"use client";

import { useEffect } from "react";

interface Props {
  eventId: string;
}

export const SaveEventId = ({ eventId }: Props) => {
  useEffect(() => {
    if (eventId) {
      localStorage.setItem("eventId", eventId);
    }
  }, [eventId]);
  return null;
};
