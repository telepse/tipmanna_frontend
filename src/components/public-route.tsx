"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import { useSelector } from "react-redux";
import { LoaderCircle } from "lucide-react";

// Local imports
import { RootState } from "@/redux/store";

interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, requiresVerification, tag } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated && !requiresVerification) {
      // only redirect if fully authenticated
      if (user?.role === "HOST" && tag === "EXISTING_HOST") {
        router.replace(`/tipper/${user.username}`);
      } else if (user?.role === "TIPPER") {
        router.replace(`/tipper/${user.username}`);
      } else if (user?.role === "HOST") {
        router.replace(`/host/${user.eventSlug}`);
      }
    }
  }, [isAuthenticated, requiresVerification, user, router, tag]);

  if (isAuthenticated && !requiresVerification && user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="text-primary size-14 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
