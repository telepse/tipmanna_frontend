"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { markNotificationReadAction } from "@/actions/notifications";
import { emitVideoTipReminderAction } from "@/actions/video-tip-reminder";
import { getDeviceKey } from "@/lib/getAuthToken";
import {
  videoTipReminderFlagsForSurface,
  type VideoTipReminderSurface,
  type VideoTipReminderSurfaceFlags,
} from "@/lib/video-tip-reminder-surfaces";
import { getVisitorIdForAuthMergeFromClient } from "@/lib/visitor-session";
import {
  hasVideoTipReminderSessionShown,
  markVideoTipReminderSessionShown,
} from "@/lib/video-tip-reminder-session";

const FLASH_DISMISS_MS = 5000;

export type UseVideoTipReminderParams = {
  surface: VideoTipReminderSurface;
  channelId: string | null | undefined;
  eventId: string;
  reminders: number[] | null | undefined;
  currentTimeSec: number;
  hostFirstName: string;
  videoTitle: string;
  deepLinkUrl: string;
  sectionCta?: string;
  authToken?: string | null;
  onTipNow?: () => void;
  notificationIdRef?: React.MutableRefObject<string | null>;
  /** Overrides surface defaults (e.g. homepage preview disables in-app). */
  reminderFlagsOverride?: Partial<VideoTipReminderSurfaceFlags>;
};

export function useVideoTipReminder({
  surface,
  channelId,
  eventId,
  reminders,
  currentTimeSec,
  hostFirstName,
  videoTitle,
  deepLinkUrl,
  authToken,
  onTipNow,
  notificationIdRef,
  reminderFlagsOverride,
}: UseVideoTipReminderParams) {
  const baseFlags = videoTipReminderFlagsForSurface(surface);
  const flags = {
    flash: reminderFlagsOverride?.flash ?? baseFlags.flash,
    inApp: reminderFlagsOverride?.inApp ?? baseFlags.inApp,
  };
  const [activeOffsetSec, setActiveOffsetSec] = useState<number | null>(null);
  const shownRef = useRef<Set<number>>(new Set());
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inAppSentRef = useRef<Set<number>>(new Set());
  const lastNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    shownRef.current = new Set();
    inAppSentRef.current = new Set();
    setActiveOffsetSec(null);
  }, [channelId]);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissOverlay = useCallback(() => {
    clearDismissTimer();
    setActiveOffsetSec(null);
  }, [clearDismissTimer]);

  const scheduleAutoDismiss = useCallback(() => {
    clearDismissTimer();
    dismissTimerRef.current = setTimeout(() => {
      setActiveOffsetSec(null);
    }, FLASH_DISMISS_MS);
  }, [clearDismissTimer]);

  const maybeEmitInApp = useCallback(
    async (offsetSec: number) => {
      if (!flags.inApp || !channelId) return;
      if (inAppSentRef.current.has(offsetSec)) return;
      if (hasVideoTipReminderSessionShown(channelId, offsetSec)) return;
      inAppSentRef.current.add(offsetSec);

      try {
        const res = await emitVideoTipReminderAction({
          channelId,
          offsetSec,
          eventId,
          videoTitle,
          hostFirstName,
          deepLinkUrl,
          token: authToken,
          visitorId: getVisitorIdForAuthMergeFromClient(),
          deviceKey: typeof window !== "undefined" ? getDeviceKey() : undefined,
        });
        if (res.success && res.data?.notificationId) {
          lastNotificationIdRef.current = res.data.notificationId;
          if (notificationIdRef) {
            notificationIdRef.current = res.data.notificationId;
          }
        }
      } catch {
        /* guest without auth — in-app only when signed in */
      }
    },
    [
      authToken,
      channelId,
      deepLinkUrl,
      eventId,
      flags.inApp,
      hostFirstName,
      notificationIdRef,
      videoTitle,
    ]
  );

  useEffect(() => {
    if (!channelId || !reminders?.length) return;

    for (const minute of reminders) {
      const offsetSec = minute * 60;
      if (currentTimeSec < offsetSec) continue;
      if (shownRef.current.has(offsetSec)) continue;
      if (hasVideoTipReminderSessionShown(channelId, offsetSec)) {
        shownRef.current.add(offsetSec);
        continue;
      }

      shownRef.current.add(offsetSec);
      markVideoTipReminderSessionShown(channelId, offsetSec);
      void maybeEmitInApp(offsetSec);

      if (flags.flash) {
        setActiveOffsetSec(offsetSec);
        scheduleAutoDismiss();
      }
      break;
    }
  }, [
    channelId,
    currentTimeSec,
    flags.flash,
    maybeEmitInApp,
    reminders,
    scheduleAutoDismiss,
  ]);

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  const handleTipNow = useCallback(() => {
    dismissOverlay();
    const notificationId = lastNotificationIdRef.current;
    if (notificationId) {
      void markNotificationReadAction(notificationId);
    }
    onTipNow?.();
  }, [dismissOverlay, onTipNow]);

  const handleDismiss = useCallback(() => {
    dismissOverlay();
  }, [dismissOverlay]);

  return {
    showFlashOverlay: flags.flash && activeOffsetSec !== null,
    handleTipNow,
    handleDismiss,
  };
}
