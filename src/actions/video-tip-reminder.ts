"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

export async function emitVideoTipReminderAction(input: {
  channelId: string;
  offsetSec: number;
  eventId: string;
  videoTitle: string;
  hostFirstName: string;
  deepLinkUrl: string;
  token?: string | null;
  visitorId?: string | null;
  deviceKey?: string | null;
}) {
  return runServerFetch<{ notificationId: string; skipped?: boolean }>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/notifications/video-tip-reminder`,
    {
      method: "POST",
      headers: {
        ...(await serverAuthHeaders(input.token)),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelId: input.channelId,
        offsetSec: input.offsetSec,
        eventId: input.eventId,
        videoTitle: input.videoTitle,
        hostFirstName: input.hostFirstName,
        deepLinkUrl: input.deepLinkUrl,
        visitorId: input.visitorId?.trim() || undefined,
        deviceKey: input.deviceKey?.trim() || undefined,
      }),
      cache: "no-store",
    },
    "emitVideoTipReminderAction"
  );
}
