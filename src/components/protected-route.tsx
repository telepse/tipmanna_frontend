"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { LoaderCircle } from "lucide-react";

import { RootState } from "@/redux/store";
import { isProtectedRouteSessionReady } from "@/lib/protected-route-session";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const {
    user,
    token,
    isAuthenticated,
    requiresVerification,
    persistAuthHydrationComplete,
  } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    let cancelled = false;

    const decide = async () => {
      const local = isProtectedRouteSessionReady({
        persistAuthHydrationComplete,
        isAuthenticated,
        requiresVerification,
        userId: user?.id,
        token,
      });

      if (local === "pending") {
        return;
      }

      if (local === "allowed") {
        if (!cancelled) setChecking(false);
        return;
      }

      // Stale persist without cookies — confirm HttpOnly session before sign-out redirect.
      try {
        const res = await fetch("/api/auth/session/status", {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as { authenticated?: boolean };
          if (body.authenticated) {
            setChecking(false);
            return;
          }
        }
      } catch {
        /* fall through to sign-in */
      }

      if (!cancelled) {
        router.replace("/sign-in");
      }
    };

    void decide();
  }, [
    isAuthenticated,
    requiresVerification,
    user,
    token,
    persistAuthHydrationComplete,
    router,
  ]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="text-primary size-14 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
