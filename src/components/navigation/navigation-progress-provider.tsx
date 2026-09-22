"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { isScreenOverlayPath } from "@/lib/pwa-install-trigger";

export type AppRouterContextValue = {
  push: (href: string) => void;
  replace: (href: string) => void;
  prefetch: (href: string) => void;
  isNavigating: boolean;
};

const AppRouterContext = createContext<AppRouterContextValue | null>(null);

export function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [clickPending, setClickPending] = useState(false);

  useEffect(() => {
    setClickPending(false);
  }, [pathname]);

  const push = useCallback(
    (href: string) => {
      setClickPending(true);
      startTransition(() => {
        router.push(href);
      });
    },
    [router, startTransition]
  );

  const replace = useCallback(
    (href: string) => {
      setClickPending(true);
      startTransition(() => {
        router.replace(href);
      });
    },
    [router, startTransition]
  );

  const prefetch = useCallback(
    (href: string) => {
      void router.prefetch(href);
    },
    [router]
  );

  const isNavigating = isPending || clickPending;
  const showProgressBar = isNavigating && !isScreenOverlayPath(pathname ?? "");

  const value: AppRouterContextValue = {
    push,
    replace,
    prefetch,
    isNavigating,
  };

  return (
    <AppRouterContext.Provider value={value}>
      {showProgressBar ? (
        <div
          className="pointer-events-none fixed top-0 right-0 left-0 z-[99998] h-1 overflow-hidden bg-neutral-200/90"
          role="progressbar"
          aria-label="Loading page"
          aria-busy="true"
        >
          <div className="navigation-progress-bar-inner h-full bg-black" />
        </div>
      ) : null}
      {children}
    </AppRouterContext.Provider>
  );
}

export function useAppRouter(): AppRouterContextValue {
  const ctx = useContext(AppRouterContext);
  const router = useRouter();

  if (!ctx) {
    return {
      push: href => router.push(href),
      replace: href => router.replace(href),
      prefetch: href => {
        void router.prefetch(href);
      },
      isNavigating: false,
    };
  }

  return ctx;
}
