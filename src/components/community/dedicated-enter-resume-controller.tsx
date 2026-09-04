"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useSideChick } from "@/components/community/side-chick-provider";
import {
  clearPendingDedicatedEnter,
  readPendingDedicatedEnter,
} from "@/lib/pending-dedicated-enter";
import type { RootState } from "@/redux/store";
import { assertNotEmailVerificationRequiredFromResponse } from "@/lib/detect-email-verification-required";

const apiBase = () => process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

/** Resume dedicated-mode enter after PWA install on iOS. */
export function DedicatedEnterResumeController() {
  const { installed } = useInstallPrompt();
  const sideChick = useSideChick();
  const router = useRouter();
  const authToken = useSelector((s: RootState) => s.auth.token);
  const resumedRef = useRef(false);

  useEffect(() => {
    if (!installed || !authToken) return;
    const pending = readPendingDedicatedEnter();
    if (!pending || resumedRef.current) return;

    resumedRef.current = true;
    void (async () => {
      try {
        const r = await fetch(
          `${apiBase()}/communities/${encodeURIComponent(pending.communityId)}/side-chick/enter`,
          { method: "POST", headers: { Authorization: `Bearer ${authToken}` } }
        );
        if (r.status === 200 || r.status === 409) {
          clearPendingDedicatedEnter();
          await sideChick.refresh();
          router.push("/explore");
        } else {
          await assertNotEmailVerificationRequiredFromResponse(r);
        }
      } catch {
        resumedRef.current = false;
      }
    })();
  }, [authToken, installed, router, sideChick]);

  return null;
}
