"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { isTipCustomizationEnabled } from "@/lib/tip-customization";
import type { ActiveTipConfigResponse } from "@/lib/tip-config-types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export type TipConfigHookState =
  | { status: "disabled" }
  | { status: "loading" }
  | ({ status: "ready" } & ActiveTipConfigResponse);

/** Ignore stale fetch responses after eventId changes. */
export function shouldApplyTipConfigFetch(
  requestId: number,
  latestRequestId: number
): boolean {
  return requestId === latestRequestId;
}

export function useTipConfig(eventId: string | undefined): TipConfigHookState {
  const [state, setState] = useState<TipConfigHookState>(() =>
    !eventId || !isTipCustomizationEnabled()
      ? { status: "disabled" }
      : { status: "loading" }
  );
  const etagRef = useRef<string | null>(null);
  const fetchGenerationRef = useRef(0);

  const fetchConfig = useCallback(
    async (requestId: number) => {
      if (!eventId || !isTipCustomizationEnabled()) return;
      try {
        const res = await fetch(`${apiBase()}/tip-config/${eventId}/active`, {
          cache: "no-store",
        });
        if (!shouldApplyTipConfigFetch(requestId, fetchGenerationRef.current)) {
          return;
        }
        if (!res.ok) {
          setState({ status: "ready", mode: "legacy" });
          return;
        }
        const json = (await res.json()) as ActiveTipConfigResponse;
        if (!shouldApplyTipConfigFetch(requestId, fetchGenerationRef.current)) {
          return;
        }
        if (json.mode === "live") {
          etagRef.current = json.etag;
        } else {
          etagRef.current = null;
        }
        setState({ status: "ready", ...json });
      } catch {
        if (!shouldApplyTipConfigFetch(requestId, fetchGenerationRef.current)) {
          return;
        }
        setState({ status: "ready", mode: "legacy" });
      }
    },
    [eventId]
  );

  useEffect(() => {
    if (!eventId || !isTipCustomizationEnabled()) {
      setState({ status: "disabled" });
      return;
    }
    const requestId = ++fetchGenerationRef.current;
    setState({ status: "loading" });
    void fetchConfig(requestId);
  }, [eventId, fetchConfig]);

  useEffect(() => {
    if (!eventId || !isTipCustomizationEnabled()) return;

    const channelName = `tip-config-${eventId}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const onPublish = (data: { etag?: string }) => {
      if (typeof data?.etag === "string" && data.etag === etagRef.current) {
        return;
      }
      const requestId = ++fetchGenerationRef.current;
      void fetchConfig(requestId);
    };

    channel.bind("config.published", onPublish);

    return () => {
      channel.unbind("config.published", onPublish);
      unsubscribeChannel(channelName);
    };
  }, [eventId, fetchConfig]);

  return state;
}
