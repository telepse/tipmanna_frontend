"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Cookies from "js-cookie";
import { LoaderCircle } from "lucide-react";

import { RootState } from "@/redux/store";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  const { user, isAuthenticated, requiresVerification } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    const handleRedirects = () => {
      const token = Cookies.get("token");
      const userCookie = Cookies.get("user");
      const hasPersist = !!localStorage.getItem("persist:root");

      /** -----------------------------------------------
       * 1️⃣  COOKIE → LOCALSTORAGE SYNC
       * If cookies are missing but persist:root exists → clear persist:root
       * ----------------------------------------------- */
      if ((!token || !userCookie) && hasPersist) {
        localStorage.removeItem("persist:root");
      }

      /** -----------------------------------------------
       * 2️⃣  LOCALSTORAGE → COOKIE SYNC (THE BROKEN PART)
       * If persist:root is missing but cookies exist → clear cookies
       * 👉 Must run BEFORE any redirect logic
       * ----------------------------------------------- */
      if (!hasPersist && (token || userCookie)) {
        Cookies.remove("token");
        Cookies.remove("user");
      }

      /** -----------------------------------------------
       * 3️⃣  AUTH VALIDATION
       * ----------------------------------------------- */
      const finalToken = Cookies.get("token");
      const finalUser = Cookies.get("user");

      if (
        !finalToken ||
        !finalUser ||
        !isAuthenticated ||
        requiresVerification
      ) {
        router.replace("/sign-in");
        return;
      }

      /** -----------------------------------------------
       * 4️⃣  ROLE PROTECTION
       * ----------------------------------------------- */
      if (user) {
        const isHostPath = pathname.startsWith("/host");
        if (user.role === "TIPPER" && isHostPath) {
          router.replace(`/tipper/${user.username}`);
          return;
        }
      }

      setChecking(false);
    };

    handleRedirects();
  }, [isAuthenticated, requiresVerification, user, pathname, router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="text-primary size-14 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
