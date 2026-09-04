"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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

type Props = {
  children: ReactNode;
};

function HostDashboardGateInner({ children }: Props) {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const hostSession = useHostSessionContextOptional();
  const authRequestedRef = useRef(false);
  const hadWriteGrantRef = useRef(false);

  const auth = useHostCapabilityWithAuth({ hostRequiredNotice: true });
  const {
    canReadAsHost,
    canWriteAsHost,
    capability,
    sessionLoading,
    requestHostAuth,
    HostAuthModal,
  } = auth;

  const [ready, setReady] = useState(false);

  const probeLoading =
    (hostSession?.isLoading === true && hostSession?.status !== "unknown") ||
    capability.status === "loading" ||
    sessionLoading;

  const probeTransient =
    hostSession?.status === "unknown" &&
    hostSession?.code === "HOST_SESSION_PROBE_FAILED";

  useEffect(() => {
    if (canWriteAsHost) {
      hadWriteGrantRef.current = true;
    }

    if (!user || user.role === "VISITOR") {
      router.replace("/sign-in");
      return;
    }

    if (probeLoading) {
      if (!hadWriteGrantRef.current) {
        setReady(false);
      }
      return;
    }

    if (!canReadAsHost) {
      if (hostSession?.code === AUTH_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED) {
        router.replace(
          buildVerifyEmailPath({
            email: user.email,
            accountType: "HOST",
          })
        );
        return;
      }
      router.replace(user.username ? `/tipper/${user.username}` : "/sign-in");
      return;
    }

    if (canWriteAsHost) {
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
    probeLoading,
    probeTransient,
    requestHostAuth,
    router,
    user,
  ]);

  if (!ready) {
    const loadingMessage = probeLoading
      ? "Verifying host access…"
      : canReadAsHost && !canWriteAsHost
        ? "Confirm host access to open the dashboard."
        : "Sign in to your host account to access the dashboard.";

    return (
      <>
        {HostAuthModal}
        <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <LoaderCircle className="text-primary size-10 animate-spin" />
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
