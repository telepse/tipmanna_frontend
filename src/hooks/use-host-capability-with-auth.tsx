"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import SignInDialog, {
  type SignInModalPayload,
} from "@/components/auth/sign-in-dialog";
import { CohostSignInDialog } from "@/components/auth/cohost-sign-in-dialog";
import { HostUpgradeDialog } from "@/components/auth/host-upgrade-dialog";
import { useHostCapability } from "@/hooks/use-host-capability";
import {
  authErrorCodeFromActionResult,
  isAuthSessionRequired,
} from "@/lib/host-auth-fetch";
import { detectEmailVerificationRequired } from "@/lib/detect-email-verification-required";
import type { RootState } from "@/redux/store";

type PendingTask = () => void | Promise<void>;

type Options = {
  enabled?: boolean;
  hostRequiredNotice?: boolean;
  /** When true, unlinked tippers get HostUpgradeDialog instead of a no-op. */
  requireHostAccount?: boolean;
  /** Event id for cohost re-login when COHOST_SESSION_REQUIRED is returned. */
  cohostEventId?: string;
};

/**
 * Host capability with a built-in host login modal for management writes.
 * Reads work when linked; writes require an active host session (hybrid model).
 */
export function useHostCapabilityWithAuth(options?: Options) {
  const enabled = options?.enabled ?? true;
  const hostRequiredNotice = options?.hostRequiredNotice ?? false;
  const requireHostAccount = options?.requireHostAccount ?? false;
  const cohostEventId = options?.cohostEventId;

  const user = useSelector((s: RootState) => s.auth.user);
  const base = useHostCapability({ enabled });
  const [hostSignInOpen, setHostSignInOpen] = useState(false);
  const [cohostSignInOpen, setCohostSignInOpen] = useState(false);
  const [hostUpgradeOpen, setHostUpgradeOpen] = useState(false);
  const pendingRef = useRef<PendingTask | null>(null);

  useEffect(() => {
    if (base.canWriteAsHost && hostSignInOpen) {
      setHostSignInOpen(false);
    }
  }, [base.canWriteAsHost, hostSignInOpen]);

  const requestHostAuth = useCallback(
    (onSuccess?: PendingTask) => {
      if (base.canWriteAsHost) {
        void onSuccess?.();
        return;
      }
      if (base.capability.status === "loading" || base.sessionLoading) {
        pendingRef.current = onSuccess ?? null;
        return;
      }
      if (base.capability.status === "none") {
        if (requireHostAccount && user?.role === "TIPPER" && user.email) {
          setHostUpgradeOpen(true);
        }
        return;
      }
      pendingRef.current = onSuccess ?? null;
      setHostSignInOpen(true);
    },
    [
      base.canWriteAsHost,
      base.capability.status,
      base.sessionLoading,
      requireHostAccount,
      user?.email,
      user?.role,
    ]
  );

  useEffect(() => {
    if (!base.canWriteAsHost || !pendingRef.current) return;
    const task = pendingRef.current;
    pendingRef.current = null;
    void task();
  }, [base.canWriteAsHost]);

  const requestCohostAuth = useCallback((onSuccess?: PendingTask) => {
    pendingRef.current = onSuccess ?? null;
    setCohostSignInOpen(true);
  }, []);

  const resumePending = useCallback(() => {
    const task = pendingRef.current;
    pendingRef.current = null;
    void task?.();
  }, []);

  const onHostSignInSuccess = useCallback(
    (_payload: SignInModalPayload) => {
      setHostSignInOpen(false);
      void base.refresh().then(resumePending);
    },
    [base, resumePending]
  );

  const onCohostSignInSuccess = useCallback(() => {
    setCohostSignInOpen(false);
    resumePending();
  }, [resumePending]);

  /** Intercept API/action auth errors and open the correct login modal. */
  const handleAuthRequiredError = useCallback(
    (
      result: {
        error?: string | null;
        message?: string | null;
        validationBody?: unknown;
      },
      retry?: PendingTask
    ): boolean => {
      const { code, message } = authErrorCodeFromActionResult(result);
      if (
        detectEmailVerificationRequired(result, {
          accountType: "HOST",
        })
      ) {
        return true;
      }
      const kind = isAuthSessionRequired(code, message);
      if (kind === "host") {
        requestHostAuth(retry);
        return true;
      }
      if (kind === "cohost") {
        requestCohostAuth(retry);
        return true;
      }
      return false;
    },
    [requestCohostAuth, requestHostAuth]
  );

  const HostAuthModal = (
    <>
      <SignInDialog
        open={hostSignInOpen}
        onOpenChange={setHostSignInOpen}
        title="Sign in to your host account"
        defaultUserType="host"
        hostRequiredNotice={hostRequiredNotice}
        allowInlineSignUp
        onSuccess={onHostSignInSuccess}
      />
      {cohostEventId ? (
        <CohostSignInDialog
          open={cohostSignInOpen}
          onOpenChange={setCohostSignInOpen}
          eventId={cohostEventId}
          defaultEmail={user?.email ?? ""}
          onSuccess={onCohostSignInSuccess}
        />
      ) : null}
      {requireHostAccount && user?.role === "TIPPER" && user.email ? (
        <HostUpgradeDialog
          open={hostUpgradeOpen}
          onOpenChange={setHostUpgradeOpen}
          email={user.email}
        />
      ) : null}
    </>
  );

  return {
    ...base,
    requestHostAuth,
    requestCohostAuth,
    handleAuthRequiredError,
    HostAuthModal,
  };
}
