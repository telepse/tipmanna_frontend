"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { usePathname, useSearchParams } from "next/navigation";
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
import {
  hostAuthOutcomeHandled,
  type HostAuthRequestOutcome,
} from "@/lib/host-auth-request-outcome";
import type { RootState } from "@/redux/store";
import {
  SIGN_IN_NESTED_OVERLAY_Z_INDEX,
  SIGN_IN_NESTED_Z_INDEX,
} from "@/lib/drawer-z-index";
import { START_COMMUNITY_CHECKING_HOST_LABEL } from "@/lib/start-community-guest-resume";

type PendingTask = () => void | Promise<void>;

export type RequestHostAuthOptions = {
  upgradeReturnTo?: string;
};

type Options = {
  enabled?: boolean;
  hostRequiredNotice?: boolean;
  /** When true, unlinked tippers get HostUpgradeDialog instead of a no-op. */
  requireHostAccount?: boolean;
  /** Event id for cohost re-login when COHOST_SESSION_REQUIRED is returned. */
  cohostEventId?: string;
  /** Override HostUpgrade redirect (e.g. hub + startCommunity=1). */
  hostUpgradeReturnToOverride?: string | null;
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
  const hostUpgradeReturnToOverride =
    options?.hostUpgradeReturnToOverride ?? null;

  const user = useSelector((s: RootState) => s.auth.user);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = useHostCapability({ enabled });
  const [hostSignInOpen, setHostSignInOpen] = useState(false);
  const [cohostSignInOpen, setCohostSignInOpen] = useState(false);
  const [hostUpgradeOpen, setHostUpgradeOpen] = useState(false);
  const pendingRef = useRef<PendingTask | null>(null);
  const pendingUpgradeReturnToRef = useRef<string | undefined>(undefined);
  const hostCheckToastRef = useRef<string | number | null>(null);

  const hostAuthChecking = useMemo(
    () =>
      enabled && (base.capability.status === "loading" || base.sessionLoading),
    [base.capability.status, base.sessionLoading, enabled]
  );

  const defaultUpgradeReturnTo = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const resolveUpgradeReturnTo = useCallback(
    (callOptions?: RequestHostAuthOptions) => {
      if (callOptions?.upgradeReturnTo) return callOptions.upgradeReturnTo;
      if (hostUpgradeReturnToOverride) return hostUpgradeReturnToOverride;
      return defaultUpgradeReturnTo;
    },
    [defaultUpgradeReturnTo, hostUpgradeReturnToOverride]
  );

  const [activeUpgradeReturnTo, setActiveUpgradeReturnTo] = useState(() =>
    resolveUpgradeReturnTo()
  );

  const showHostCheckToast = useCallback(() => {
    if (hostCheckToastRef.current != null) return;
    hostCheckToastRef.current = toast.info(
      START_COMMUNITY_CHECKING_HOST_LABEL,
      { autoClose: 4000 }
    );
  }, []);

  useEffect(() => {
    if (base.canWriteAsHost && hostSignInOpen) {
      setHostSignInOpen(false);
    }
  }, [base.canWriteAsHost, hostSignInOpen]);

  useEffect(() => {
    const waitingOnHostCheck = hostAuthChecking && pendingRef.current != null;
    if (waitingOnHostCheck) return;
    if (hostCheckToastRef.current != null) {
      toast.dismiss(hostCheckToastRef.current);
      hostCheckToastRef.current = null;
    }
  }, [hostAuthChecking]);

  const requestHostAuth = useCallback(
    (
      onSuccess?: PendingTask,
      callOptions?: RequestHostAuthOptions
    ): HostAuthRequestOutcome => {
      if (base.canWriteAsHost) {
        void onSuccess?.();
        return "ran";
      }
      if (base.capability.status === "loading" || base.sessionLoading) {
        pendingRef.current = onSuccess ?? null;
        pendingUpgradeReturnToRef.current = callOptions?.upgradeReturnTo;
        showHostCheckToast();
        return "loading-hold";
      }
      if (base.capability.status === "none") {
        if (requireHostAccount && user?.role === "TIPPER" && user.email) {
          setActiveUpgradeReturnTo(resolveUpgradeReturnTo(callOptions));
          setHostUpgradeOpen(true);
          return "upgrade";
        }
        return "noop";
      }
      pendingRef.current = onSuccess ?? null;
      pendingUpgradeReturnToRef.current = callOptions?.upgradeReturnTo;
      setHostSignInOpen(true);
      return "signin";
    },
    [
      base.canWriteAsHost,
      base.capability.status,
      base.sessionLoading,
      requireHostAccount,
      resolveUpgradeReturnTo,
      showHostCheckToast,
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

  /** Resolve loading-hold when link probe finishes without a host account. */
  useEffect(() => {
    if (base.capability.status === "loading" || base.sessionLoading) return;
    if (!pendingRef.current) return;

    if (base.canWriteAsHost) return;

    if (base.capability.status === "none") {
      const task = pendingRef.current;
      pendingRef.current = null;
      if (requireHostAccount && user?.role === "TIPPER" && user.email) {
        setActiveUpgradeReturnTo(
          resolveUpgradeReturnTo({
            upgradeReturnTo: pendingUpgradeReturnToRef.current,
          })
        );
        pendingUpgradeReturnToRef.current = undefined;
        setHostUpgradeOpen(true);
        pendingRef.current = task;
        return;
      }
      return;
    }

    if (base.capability.status === "stale") {
      setHostSignInOpen(true);
    }
  }, [
    base.canWriteAsHost,
    base.capability.status,
    base.sessionLoading,
    requireHostAccount,
    resolveUpgradeReturnTo,
    user?.email,
    user?.role,
  ]);

  const requestCohostAuth = useCallback((onSuccess?: PendingTask) => {
    pendingRef.current = onSuccess ?? null;
    setCohostSignInOpen(true);
    return "signin" as const;
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
        const outcome = requestHostAuth(retry);
        return hostAuthOutcomeHandled(outcome);
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
        defaultHostAuthView="signIn"
        hostRequiredNotice={hostRequiredNotice}
        allowInlineSignUp
        signupSurface="host_auth_modal"
        overlayClassName={SIGN_IN_NESTED_OVERLAY_Z_INDEX}
        contentClassName={SIGN_IN_NESTED_Z_INDEX}
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
          returnTo={activeUpgradeReturnTo}
          overlayClassName={SIGN_IN_NESTED_OVERLAY_Z_INDEX}
          className={SIGN_IN_NESTED_Z_INDEX}
        />
      ) : null}
    </>
  );

  return {
    ...base,
    hostAuthChecking,
    requestHostAuth,
    requestCohostAuth,
    handleAuthRequiredError,
    HostAuthModal,
  };
}
