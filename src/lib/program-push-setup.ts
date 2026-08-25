"use client";

import { listPushSubscriptionsAction } from "@/actions/notifications";
import { mergeSubscriberRemindersAction } from "@/actions/reminder-bucket";
import type { PushPermissionState } from "@/hooks/use-push-permission";

export type ProgramPushSetupResult =
  | "push_enabled"
  | "already_subscribed"
  | "merge_failed"
  | "push_failed";

/** Merge guest subscriber reminders onto tipper (email + in-app only). */
export async function mergeGuestProgramRemindersOnly(params: {
  email: string;
  token: string | null | undefined;
}): Promise<boolean> {
  const mergeRes = await mergeSubscriberRemindersAction(
    { email: params.email },
    params.token
  );
  return mergeRes.success;
}

/** Merge guest subscriber reminders onto tipper, then enable push if needed. */
export async function completeGuestProgramPushSetup(params: {
  email: string;
  token: string | null | undefined;
  pushState: PushPermissionState;
  subscribe: () => Promise<boolean>;
}): Promise<ProgramPushSetupResult> {
  const mergeRes = await mergeSubscriberRemindersAction(
    { email: params.email },
    params.token
  );
  if (!mergeRes.success) {
    return "merge_failed";
  }

  if (await hasBackendPushSubscription(params.token)) {
    return "already_subscribed";
  }

  if (params.pushState === "subscribed") {
    return "already_subscribed";
  }

  const pushOk = await params.subscribe();
  return pushOk ? "push_enabled" : "push_failed";
}

export async function hasBackendPushSubscription(
  token?: string | null
): Promise<boolean> {
  if (!token) return false;
  const res = await listPushSubscriptionsAction(token);
  if (!res.success) return false;
  const subs = res.data?.subscriptions;
  return Array.isArray(subs) && subs.length > 0;
}

export async function ensurePushForSignedInTipper(params: {
  pushState: PushPermissionState;
  subscribe: () => Promise<boolean>;
  token?: string | null;
}): Promise<"already_subscribed" | "push_enabled" | "push_failed"> {
  if (params.pushState === "subscribed") {
    const confirmed = await hasBackendPushSubscription(params.token);
    if (confirmed) return "already_subscribed";
  }
  const pushOk = await params.subscribe();
  return pushOk ? "push_enabled" : "push_failed";
}
