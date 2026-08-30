"use client";

import { useEffect } from "react";
import { EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS } from "@/lib/explore-feed-fetch-timeout";

export function createInitialLoadingFailOpenTimer(
  setInitialLoading: (value: boolean) => void,
  timeoutMs: number = EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS
): () => void {
  const timer = window.setTimeout(() => {
    setInitialLoading(false);
  }, timeoutMs);

  return () => {
    window.clearTimeout(timer);
  };
}

/** STAB-1: never leave the initial Feed skeleton up indefinitely. */
export function useExploreFeedInitialLoadingFailOpen(
  initialLoading: boolean,
  setInitialLoading: (value: boolean) => void
): void {
  useEffect(() => {
    if (!initialLoading) return;
    return createInitialLoadingFailOpenTimer(setInitialLoading);
  }, [initialLoading, setInitialLoading]);
}
