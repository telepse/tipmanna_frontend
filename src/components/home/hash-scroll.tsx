"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { resolvePartnerScrollTargetId } from "@/lib/partner-page-metadata";

const MAX_ATTEMPTS = 80;
const RETRY_DELAY_MS = 50;

// App Router scroll restoration and lazy sections can run after first paint.
const SCROLL_WAVES_MS = [0, 50, 150, 300, 500, 800, 1200, 2000, 3200, 4500];

function resolveScrollTargetId(
  pathname: string,
  section: string | null
): string | null {
  const hashId = window.location.hash.replace(/^#/, "").trim();
  if (hashId) return hashId;

  return resolvePartnerScrollTargetId({
    pathname,
    section,
    hash: window.location.hash,
  });
}

function scrollToElement(id: string, behavior: ScrollBehavior = "auto"): boolean {
  const element = document.getElementById(id);
  if (!element) return false;

  element.scrollIntoView({ behavior, block: "start" });
  return true;
}

function scheduleScrollToId(
  id: string,
  startDelayMs: number,
  behavior: ScrollBehavior = "auto"
): () => void {
  if (!id) return () => {};

  let attempts = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const tryScroll = () => {
    if (cancelled) return;
    if (scrollToElement(id, behavior)) return;

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

function scrollToCurrentTarget(
  pathname: string,
  section: string | null,
  behavior: ScrollBehavior = "auto"
): () => void {
  const id = resolveScrollTargetId(pathname, section);
  if (!id) return () => {};

  const cleanups = SCROLL_WAVES_MS.map(delay =>
    scheduleScrollToId(id, delay, behavior)
  );

  return () => cleanups.forEach(cleanup => cleanup());
}

export default function HashScroll() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

  useEffect(() => {
    let activeCleanup = scrollToCurrentTarget(pathname, section, "auto");

    const handleHashChange = () => {
      activeCleanup();
      activeCleanup = scrollToCurrentTarget(pathname, section, "smooth");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      activeCleanup();
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [pathname, section]);

  return null;
}
