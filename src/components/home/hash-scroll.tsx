"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const MAX_ATTEMPTS = 60;
const RETRY_DELAY_MS = 50;

// App Router scroll restoration can run after first paint — retry through that window.
const SCROLL_WAVES_MS = [0, 50, 150, 300, 500, 800, 1200, 2000];

function scrollToElement(id: string): boolean {
  const element = document.getElementById(id);
  if (!element) return false;

  element.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function scheduleScrollToHash(hash: string, startDelayMs: number): () => void {
  const id = hash.replace(/^#/, "");
  if (!id) return () => {};

  let attempts = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const tryScroll = () => {
    if (cancelled) return;
    if (scrollToElement(id)) return;

    attempts += 1;
    if (attempts < MAX_ATTEMPTS) {
      timeoutId = setTimeout(tryScroll, RETRY_DELAY_MS);
    }
  };

  timeoutId = setTimeout(tryScroll, startDelayMs);

  return () => {
    cancelled = true;
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  };
}

function scrollToCurrentHash(): () => void {
  const hash = window.location.hash;
  if (!hash) return () => {};

  const cleanups = SCROLL_WAVES_MS.map(delay =>
    scheduleScrollToHash(hash, delay)
  );

  return () => cleanups.forEach(cleanup => cleanup());
}

export default function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let activeCleanup = scrollToCurrentHash();

    const handleHashChange = () => {
      activeCleanup();
      activeCleanup = scrollToCurrentHash();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      activeCleanup();
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [pathname]);

  return null;
}
