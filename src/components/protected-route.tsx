"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { LoaderCircle } from "lucide-react";

import { RootState } from "@/redux/store";
import { isProtectedRouteHydrationPending } from "@/lib/protected-route-session";
import { safeInternalPath } from "@/lib/post-host-auth-destination";

interface ProtectedRouteProps {
  children: ReactNode;
}

function currentReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  return safeInternalPath(
    `${window.location.pathname}${window.location.search}`
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const { persistAuthHydrationComplete, requiresVerification } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    const cancel = { value: false };

    const decide = async () => {
      if (
        isProtectedRouteHydrationPending({ persistAuthHydrationComplete })
      ) {
        return;
      }

      if (requiresVerification) {
        if (!cancel.value) {
          const returnTo = currentReturnPath();
          const next = returnTo
            ? `/sign-in?next=${encodeURIComponent(returnTo)}`
            : "/sign-in";
          router.replace(next);
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/session/status", {
          credentials: "include",
          cache: "no-store",
        });
        if (cancel.value) return;
        if (res.ok) {
          const body = (await res.json()) as { authenticated?: boolean };
          if (body.authenticated) {
            setChecking(false);
            return;
          }
        }
      } catch {
        /* fall through */
      }

      if (!cancel.value) {
        const returnTo = currentReturnPath();
        const next = returnTo
          ? `/sign-in?next=${encodeURIComponent(returnTo)}`
          : "/sign-in";
        router.replace(next);
      }
    };

    void decide();
    return () => {
      cancel.value = true;
    };
  }, [persistAuthHydrationComplete, requiresVerification, router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="text-primary size-14 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
