"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { LoaderCircle } from "lucide-react";

import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { HostSubscriptionReturnHandler } from "@/components/dashboard/host-subscription-return-handler";
import { HostAuthProvider } from "@/contexts/host-auth-context";
import { useHostSessionContextOptional } from "@/contexts/host-session-context";
import type { RootState } from "@/redux/store";
import { AUTH_ERROR_CODES } from "@/lib/authorization-policy";
import { buildVerifyEmailPath } from "@/lib/verify-email-path";
import { getHostUserFromCookies } from "@/lib/host-session-client";
import { isHostSessionGrantValid } from "@/lib/host-session-grant";
import {
  shouldInitDashboardReady,
  shouldKeepDashboardContentDuringProbe,
} from "@/lib/host-dashboard-gate-state";
import { resolveHostDashboardRedirect } from "@/lib/host-dashboard-gate-redirect";

type Props = {
  children: ReactNode;
};

function HostDashboardGateInner({ children }: Props) {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const hostSession = useHostSessionContextOptional();
  const authRequestedRef = useRef(false);
  const hadWriteGrantRef = useRef(
    typeof window !== "undefined" &&
      isHostSessionGrantValid(getHostUserFromCookies()?.id)
  );

  const auth = useHostCapabilityWithAuth({ hostRequiredNotice: true });
  const {
    canReadAsHost,
    canWriteAsHost,
    capability,
    sessionLoading,
    requestHostAuth,
    HostAuthModal,
  } = auth;

  const [ready, setReady] = useState(() => {
    if (typeof window === "undefined") return false;
    const hostId = getHostUserFromCookies()?.id ?? null;
    return shouldInitDashboardReady(isHostSessionGrantValid(hostId));
  });

  const cookieHostId = useMemo(
    () => getHostUserFromCookies()?.id ?? null,
    [hostSession?.hostId, hostSession?.status]
  );

  const grantValid = isHostSessionGrantValid(cookieHostId);

  const probeLoading =
    (hostSession?.isLoading === true && hostSession?.status !== "unknown") ||
    capability.status === "loading" ||
    sessionLoading;

  const probeTransient =
    hostSession?.status === "unknown" &&
    hostSession?.code === "HOST_SESSION_PROBE_FAILED";

  const keepContentDuringProbe = shouldKeepDashboardContentDuringProbe({
    hadWriteGrant: hadWriteGrantRef.current,
    grantValid,
    probeLoading,
  });

  useEffect(() => {
    if (grantValid) {
      hadWriteGrantRef.current = true;
    }
    if (canWriteAsHost) {
      hadWriteGrantRef.current = true;
    }

    if (!user || user.role === "VISITOR") {
      router.replace("/sign-in");
      return;
    }

    if (probeLoading) {
      if (!keepContentDuringProbe) {
        setReady(false);
      }
      return;
    }

    if (hostSession?.code === AUTH_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED) {
      router.replace(
        buildVerifyEmailPath({
          email: user.email,
          accountType: "HOST",
        })
      );
      return;
    }

    const redirectDecision = resolveHostDashboardRedirect({
      canReadAsHost,
      canWriteAsHost,
      capabilityStatus: capability.status,
      probeLoading,
      hostSessionLoading: hostSession?.isLoading ?? false,
    });

    if (redirectDecision === "wait") {
      if (!keepContentDuringProbe) {
        setReady(false);
      }
      return;
    }

    if (redirectDecision === "tipper_fallback") {
      router.replace(user.username ? `/tipper/${user.username}` : "/sign-in");
      return;
    }

    if (redirectDecision === "ready") {
      authRequestedRef.current = false;
      setReady(true);
      return;
    }

    if (probeTransient) {
      setReady(true);
      return;
    }

    setReady(false);
    if (!authRequestedRef.current) {
      authRequestedRef.current = true;
      requestHostAuth(() => {
        authRequestedRef.current = false;
        setReady(true);
      });
    }
  }, [
    canReadAsHost,
    canWriteAsHost,
    capability.status,
    keepContentDuringProbe,
    probeLoading,
    probeTransient,
    requestHostAuth,
    router,
    grantValid,
    user,
    hostSession?.code,
    hostSession?.isLoading,
  ]);

  if (!ready) {
    const loadingMessage = probeLoading
      ? "Verifying host access…"
      : canReadAsHost && !canWriteAsHost
        ? "Confirm host access to open the dashboard."
        : "Sign in to your host account to access the dashboard.";

    const compactVerify =
      probeLoading &&
      Boolean(cookieHostId) &&
      !grantValid &&
      !hadWriteGrantRef.current;

    return (
      <>
        {HostAuthModal}
        <div
          className={
            compactVerify
              ? "flex flex-col items-center gap-2 px-4 py-8 text-center"
              : "flex h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center"
          }
        >
          <LoaderCircle className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{loadingMessage}</p>
        </div>
      </>
    );
  }

  return (
    <HostAuthProvider value={auth}>
      {HostAuthModal}
      <HostSubscriptionReturnHandler />
      {children}
    </HostAuthProvider>
  );
}

export function HostDashboardGate({ children }: Props) {
  const pathname = usePathname();
  const isHostPath = pathname.startsWith("/host");

  if (!isHostPath) {
    return <>{children}</>;
  }

  return <HostDashboardGateInner>{children}</HostDashboardGateInner>;
}
