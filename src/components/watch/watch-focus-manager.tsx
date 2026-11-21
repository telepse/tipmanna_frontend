"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { resolveWatchEscapeHref } from "./watch-escape-navigation";
import {
  activateWatchFocused,
  focusWatchSibling,
  mapWatchRemoteKey,
} from "./watch-remote-keys";

type Props = {
  children: ReactNode;
};

/** Roving focus + Enter/Escape for watch shell (10-foot UI). */
export function WatchFocusManager({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "";
  const router = useRouter();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) {
        return;
      }

      const action = mapWatchRemoteKey(event);
      if (action.type === "ignore") return;

      event.preventDefault();

      if (action.type === "move") {
        focusWatchSibling(root, action.delta);
        return;
      }
      if (action.type === "activate") {
        activateWatchFocused();
        return;
      }
      if (action.type === "escape") {
        const href = resolveWatchEscapeHref(pathname);
        if (href) router.push(href);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  return (
    <div
      ref={rootRef}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </div>
  );
}
