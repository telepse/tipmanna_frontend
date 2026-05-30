"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { LoaderCircle } from "lucide-react";

import { RootState } from "@/redux/store";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  const { user, token, isAuthenticated, requiresVerification } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    /**
     * Authorize strictly from Redux: right after login, `setCredentials` has run
     * synchronously before navigation, while redux-persist may not have flushed
     * `persist:root` yet, and `token` may be HttpOnly so `Cookies.get("token")` is
     * empty. The old cookie↔persist “sync” deleted valid cookies and forced
     * `/sign-in` — see host sign-in → dashboard flow.
     */
    const sessionOk =
      isAuthenticated &&
      !requiresVerification &&
      Boolean(user?.id && token?.trim());

    if (!sessionOk) {
      router.replace("/sign-in");
      return;
    }

    const isHostPath = pathname.startsWith("/host");
    if (user?.role === "TIPPER" && isHostPath) {
      router.replace(`/tipper/${user.username}`);
      return;
    }

    setChecking(false);
  }, [isAuthenticated, requiresVerification, user, token, pathname, router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="text-primary size-14 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
