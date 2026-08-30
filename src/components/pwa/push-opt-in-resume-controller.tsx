"use client";

import { PushOptInResumeBanner } from "@/components/pwa/push-opt-in-resume-banner";

/** Mounts tap-to-enable banner when pending push opt-in exists after PWA install. */
export function PushOptInResumeController() {
  return <PushOptInResumeBanner />;
}
