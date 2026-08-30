"use client";

import { useEffect } from "react";
import { isLikelyUuid } from "@/lib/public-video-url";

interface Props {
  eventId: string;
  /** Parent event id from loaded payload when the route param may be wrong or stale. */
  canonicalEventId?: string | null;
}

export const SaveEventId = ({ eventId, canonicalEventId }: Props) => {
  useEffect(() => {
    const id = (canonicalEventId?.trim() || eventId?.trim()) ?? "";
    if (id && isLikelyUuid(id)) {
      localStorage.setItem("eventId", id);
    }
  }, [eventId, canonicalEventId]);
  return null;
};
