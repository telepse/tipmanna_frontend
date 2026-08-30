"use server";

import { runServerFetch, actionFail } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

// -------- Send message -------- //
export async function sendMessageAction(message: {
  eventId: string;
  sender: string;
  text: string;
  tip?: number;
  secondaryText?: string;
  selectedTips?: string[];
  purchasedSummary?: string;
  eventChannelId?: string;
  transactionId?: string;
}) {
  if (!message?.eventId?.trim()) {
    return actionFail("Event ID is required", "sendMessageAction");
  }
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    },
    "sendMessageAction"
  );
}

/** Purchased comment-line messages for one EventChannel (video): username + message only. */
export async function getPurchasedCommentsForChannelAction(
  eventId: string,
  channelId: string
) {
  const eid = eventId?.trim();
  const cid = channelId?.trim();
  if (!eid || !cid) {
    return actionFail(
      "Event ID and channel ID are required",
      "getPurchasedCommentsForChannelAction"
    );
  }
  const { buildEventRoomRequestHeaders } = await import(
    "@/lib/event-room-request"
  );
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch<{ username: string; message: string }[]>(
    `${base.replace(/\/$/, "")}/messages/channel/${encodeURIComponent(eid)}/${encodeURIComponent(cid)}/purchased-comments`,
    {
      method: "GET",
      headers: await buildEventRoomRequestHeaders(eid),
      cache: "no-store",
    },
    "getPurchasedCommentsForChannelAction",
    raw =>
      Array.isArray(raw)
        ? (raw as { username?: string; message?: string }[])
            .filter(
              x =>
                typeof x?.username === "string" &&
                typeof x?.message === "string"
            )
            .map(x => ({
              username: x.username as string,
              message: x.message as string,
            }))
        : []
  );
}

export type CommentDrawerData = {
  channel: {
    id: string;
    title: string;
    description: string | null;
    eventVideoType: string;
    contentLanguage: string;
    contentCountry: string;
    createdAt: string;
    videoTipCount: number;
    eventRoomTipCount: number;
    communityName: string | null;
    communityId: string | null;
    coOwnerName: string | null;
    coOwnerNames: string[];
  };
  host: {
    firstName: string | null;
    username: string | null;
    fullName: string | null;
  };
  metrics: {
    commentCount: number;
    commentLikeCount: number;
    shareCount: number;
    saveCount: number;
    videoTipCount: number;
    eventRoomTipCount: number;
    viewCount: number;
    encounterCount?: number;
  };
  comments: Array<{
    id: string;
    username: string;
    message: string;
    createdAt: string;
    likeCount: number;
    likedByMe: boolean;
  }>;
};

export async function getChannelCommentDrawerAction(
  eventId: string,
  channelId: string,
  token?: string | null
) {
  const eid = eventId?.trim();
  const cid = channelId?.trim();
  if (!eid || !cid) {
    return actionFail(
      "Event ID and channel ID are required",
      "getChannelCommentDrawerAction"
    );
  }
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch<CommentDrawerData>(
    `${base.replace(/\/$/, "")}/messages/channel/${encodeURIComponent(eid)}/${encodeURIComponent(cid)}/drawer`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getChannelCommentDrawerAction"
  );
}

export async function toggleCommentLikeAction(
  messageId: string,
  token?: string | null
) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch<{ liked: boolean; likeCount: number }>(
    `${base.replace(/\/$/, "")}/messages/comments/${encodeURIComponent(messageId)}/like`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
    },
    "toggleCommentLikeAction"
  );
}

export async function getCommentLikesActivityAction(token?: string | null) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch(
    `${base.replace(/\/$/, "")}/messages/tipper/activity/comment-likes`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getCommentLikesActivityAction"
  );
}

export async function getTipsDrawerAction(
  eventId: string,
  channelId: string | null,
  scope: "event" | "video" = "event",
  token?: string | null,
  opts?: { cursor?: string | null; limit?: number }
) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const path =
    scope === "video" && channelId
      ? `/messages/channel/${encodeURIComponent(eventId)}/${encodeURIComponent(channelId)}/tips?${qs}`
      : `/messages/event/${encodeURIComponent(eventId)}/tips?${qs}`;
  return runServerFetch(
    `${base.replace(/\/$/, "")}${path}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getTipsDrawerAction"
  );
}

export async function reportChannelContentAction(
  channelId: string,
  body: { reason: string; otherText?: string },
  token?: string | null
) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch(
    `${base.replace(/\/$/, "")}/messages/channel/${encodeURIComponent(channelId)}/report`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
    },
    "reportChannelContentAction"
  );
}

// -------- Get messages by event -------- //
export async function getMessagesByEventAction(eventId: string) {
  if (!eventId?.trim()) {
    return actionFail("Event ID is required", "getMessagesByEventAction");
  }
  const trimmed = eventId.trim();
  const { buildEventRoomRequestHeaders } = await import(
    "@/lib/event-room-request"
  );
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/messages/${trimmed}`,
    {
      method: "GET",
      headers: await buildEventRoomRequestHeaders(trimmed),
      cache: "no-store",
    },
    "getMessagesByEventAction"
  );
}

// -------- Broadcast tip animation -------- //
export async function broadcastTipAnimation({
  eventId,
  sender,
  selectedTips,
}: {
  eventId: string;
  sender: string;
  selectedTips: string[];
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/broadcast-tip-animation`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, sender, selectedTips }),
    },
    "broadcastTipAnimation"
  );
}
