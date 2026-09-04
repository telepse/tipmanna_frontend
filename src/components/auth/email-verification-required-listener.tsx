"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { markRequiresVerification } from "@/features/auth-slice";
import { clearAuthSession } from "@/lib/session-client";
import {
  EMAIL_VERIFICATION_REQUIRED_EVENT,
  type EmailVerificationRequiredDetail,
} from "@/lib/email-verification-events";
import { buildVerifyEmailPath } from "@/lib/verify-email-path";

export function EmailVerificationRequiredListener() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const authEmail = useSelector((s: RootState) => s.auth.user?.email);
  const handledRef = useRef(false);

  useEffect(() => {
    handledRef.current = false;
  }, [pathname]);

  useEffect(() => {
    const onRequired = (event: Event) => {
      if (handledRef.current) return;
      handledRef.current = true;

      const detail = (event as CustomEvent<EmailVerificationRequiredDetail>)
        .detail;

      dispatch(markRequiresVerification());
      void clearAuthSession();

      const email = detail.email?.trim() || authEmail?.trim();
      const accountType = detail.accountType ?? "TIPPER";
      const next =
        detail.next ??
        (pathname.startsWith("/verify-email") ? undefined : pathname);

      router.push(
        buildVerifyEmailPath({
          email,
          accountType,
          next,
        })
      );
    };

    window.addEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, onRequired);
    return () => {
      window.removeEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, onRequired);
    };
  }, [authEmail, dispatch, pathname, router]);

  return null;
}
