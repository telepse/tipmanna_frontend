"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { LoaderCircle } from "lucide-react";

import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import type { RootState } from "@/redux/store";

type Props = {
  children: ReactNode;
};

/**
 * Requires an active host session for all /host/* dashboard routes.
 * Linked tippers without a host session see the host login modal in place.
 */
export function HostDashboardGate({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const isHostPath = pathname.startsWith("/host");
  const authRequestedRef = useRef(false);

  const {
    canReadAsHost,
    canWriteAsHost,
    capability,
    requestHostAuth,
    HostAuthModal,
  } = useHostCapabilityWithAuth({ hostRequiredNotice: true });

  const [ready, setReady] = useState(!isHostPath);

  useEffect(() => {
    if (!isHostPath) {
      authRequestedRef.current = false;
      setReady(true);
      return;
    }

    if (!user || user.role === "VISITOR") {
      router.replace("/sign-in");
      return;
    }

    if (capability.status === "loading") {
      setReady(false);
      return;
    }

    if (!canReadAsHost) {
      router.replace(user.username ? `/tipper/${user.username}` : "/sign-in");
      return;
    }

    if (canWriteAsHost) {
      authRequestedRef.current = false;
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
    isHostPath,
    user,
    capability.status,
    canReadAsHost,
    canWriteAsHost,
    requestHostAuth,
    router,
  ]);

  if (!isHostPath) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <>
        {HostAuthModal}
        <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <LoaderCircle className="text-primary size-10 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Sign in to your host account to access the dashboard.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {HostAuthModal}
      {children}
    </>
  );
}
