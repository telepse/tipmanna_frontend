"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
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

const tipConfigMemoryCache = new Map<string, ActiveTipConfigResponse>();

/** Test-only reset. */
export function resetTipConfigCacheForTests(): void {
  tipConfigMemoryCache.clear();
}

/** Test-only prime. */
export function primeTipConfigCacheForTests(
  eventId: string,
  response: ActiveTipConfigResponse
): void {
  cacheTipConfig(eventId, response);
}

export function getCachedTipConfig(
  eventId: string | undefined
): ActiveTipConfigResponse | undefined {
  const trimmed = eventId?.trim();
  if (!trimmed) return undefined;
  return tipConfigMemoryCache.get(trimmed);
}

/** Pure helper: initial hook state for an event (cache hit vs miss). */
export function resolveTipConfigStateForEvent(
  eventId: string | undefined,
  opts?: { initial?: ActiveTipConfigResponse | null }
): TipConfigHookState {
  if (!eventId || !isTipCustomizationEnabled()) {
    return { status: "disabled" };
  }
  if (opts?.initial) {
    return { status: "ready", ...opts.initial };
  }
  const cached = getCachedTipConfig(eventId);
  if (cached) {
    return { status: "ready", ...cached };
  }
  return { status: "loading" };
}

/** Ignore stale fetch responses after eventId changes. */
export function shouldApplyTipConfigFetch(
  requestId: number,
  latestRequestId: number
): boolean {
  return requestId === latestRequestId;
}

function cacheTipConfig(eventId: string, response: ActiveTipConfigResponse) {
  tipConfigMemoryCache.set(eventId.trim(), response);
}

export function useTipConfig(
  eventId: string | undefined,
  opts?: { initial?: ActiveTipConfigResponse | null }
): TipConfigHookState {
  const [state, setState] = useState<TipConfigHookState>(() =>
    resolveTipConfigStateForEvent(eventId, opts)
  );
  const etagRef = useRef<string | null>(
    opts?.initial && opts.initial.mode === "live" ? opts.initial.etag : null
  );
  const fetchGenerationRef = useRef(0);
  const hasInitialRef = useRef(Boolean(opts?.initial));

  const fetchConfig = useCallback(
    async (requestId: number) => {
      if (isExploreE2eFixturesActiveOnClient()) return;
      if (!eventId || !isTipCustomizationEnabled()) return;
      try {
        const res = await fetch(`${apiBase()}/tip-config/${eventId}/active`, {
          cache: "no-store",
        });
        if (!shouldApplyTipConfigFetch(requestId, fetchGenerationRef.current)) {
          return;
        }
        if (!res.ok) {
          const legacy: ActiveTipConfigResponse = { mode: "legacy" };
          cacheTipConfig(eventId, legacy);
          setState({ status: "ready", ...legacy });
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
        cacheTipConfig(eventId, json);
        setState({ status: "ready", ...json });
      } catch {
        if (!shouldApplyTipConfigFetch(requestId, fetchGenerationRef.current)) {
          return;
        }
        const legacy: ActiveTipConfigResponse = { mode: "legacy" };
        cacheTipConfig(eventId, legacy);
        setState({ status: "ready", ...legacy });
      }
    },
    [eventId]
  );

  useEffect(() => {
    if (!eventId || !isTipCustomizationEnabled()) {
      setState({ status: "disabled" });
      return;
    }
    // Dual-gate: skip tip-config fetch under Explore E2E (S7).
    if (isExploreE2eFixturesActiveOnClient()) {
      setState({ status: "ready", mode: "legacy" });
      return;
    }
    if (hasInitialRef.current) {
      hasInitialRef.current = false;
      return;
    }
    const requestId = ++fetchGenerationRef.current;
    const cached = getCachedTipConfig(eventId);
    if (cached) {
      setState({ status: "ready", ...cached });
      if (cached.mode === "live") {
        etagRef.current = cached.etag;
      } else {
        etagRef.current = null;
      }
      void fetchConfig(requestId);
    } else {
      setState({ status: "loading" });
      void fetchConfig(requestId);
    }
  }, [eventId, fetchConfig]);

  useEffect(() => {
    if (!eventId || !isTipCustomizationEnabled()) return;
    // Dual-gate: skip tip-config Pusher under Explore E2E (S7).
    if (isExploreE2eFixturesActiveOnClient()) return;

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
