"use server";

import { runServerFetch, type ActionResult } from "@/lib/action-fetch";
import { serverAuthHeaders, serverHostAuthHeaders } from "@/lib/server-auth";

const base = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export type ReminderBucketPost = {
  id: string;
  title: string;
  body?: string | null;
  scheduledAt: string;
  kind?: string;
  imageUrl?: string | null;
  landingUrl?: string | null;
  durationSec?: number | null;
  enforcementId?: string | null;
  globalEnforcementId?: string | null;
};

export type ReminderBucketEntry = {
  id: string;
  postId?: string | null;
  offsetMinutes?: number;
  scheduledAt?: string;
  reminderAt?: string;
  status?: string;
  title?: string;
};

export async function listReminderBucketPostsAction(): Promise<
  ActionResult<{ posts: ReminderBucketPost[]; offsets?: number[] }>
> {
  return runServerFetch(
    `${base()}/reminder-bucket/posts`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "listReminderBucketPostsAction"
  );
}

export async function listMyReminderEntriesAction(
  clientToken?: string | null
): Promise<ActionResult<{ entries: ReminderBucketEntry[] }>> {
  return runServerFetch(
    `${base()}/reminder-bucket/me/entries`,
    {
      method: "GET",
      headers: await serverAuthHeaders(clientToken),
      cache: "no-store",
    },
    "listMyReminderEntriesAction"
  );
}

export async function listMyReminderHistoryAction(
  clientToken?: string | null
): Promise<ActionResult<{ entries: ReminderBucketEntry[] }>> {
  return runServerFetch(
    `${base()}/reminder-bucket/me/history`,
    {
      method: "GET",
      headers: await serverAuthHeaders(clientToken),
      cache: "no-store",
    },
    "listMyReminderHistoryAction"
  );
}

export async function cancelReminderEntryAction(
  entryId: string,
  clientToken?: string | null
) {
  return runServerFetch<{ ok?: boolean }>(
    `${base()}/reminder-bucket/me/entries/${encodeURIComponent(entryId)}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(clientToken),
      cache: "no-store",
    },
    "cancelReminderEntryAction"
  );
}

export async function setReminderBucketReminderAction(
  postId: string,
  body: Record<string, unknown>,
  clientToken?: string | null
) {
  return runServerFetch(
    `${base()}/reminder-bucket/posts/${encodeURIComponent(postId)}/set-reminder`,
    {
      method: "POST",
      headers: await serverAuthHeaders(clientToken),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "setReminderBucketReminderAction"
  );
}

export type CreateCommunityReminderPostBody = {
  title: string;
  body?: string;
  scheduledAt: string;
  enforcementId: string;
  kind?: string;
  channels?: Array<"in_app" | "push" | "email">;
};

export async function createCommunityReminderPostAction(
  communityId: string,
  body: CreateCommunityReminderPostBody
) {
  return runServerFetch(
    `${base()}/communities/${encodeURIComponent(communityId)}/reminder-bucket/posts`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "createCommunityReminderPostAction"
  );
}

export async function mergeSubscriberRemindersAction(
  body: { email?: string; subscriberId?: string },
  clientToken?: string | null
) {
  return runServerFetch<{ ok?: boolean; mergedCount?: number }>(
    `${base()}/reminder-bucket/merge-subscriber`,
    {
      method: "POST",
      headers: await serverAuthHeaders(clientToken),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "mergeSubscriberRemindersAction"
  );
}

export async function searchReminderEnforcementsAction(
  scope: "community" | "global",
  communityId?: string
) {
  const qs = new URLSearchParams({ scope });
  if (communityId) qs.set("communityId", communityId);
  return runServerFetch<{
    enforcements?: {
      id: string;
      title: string;
      scheduledAt: string;
      kind?: string;
    }[];
  }>(
    `${base()}/reminder-bucket/enforcements/search?${qs}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "searchReminderEnforcementsAction"
  );
}
