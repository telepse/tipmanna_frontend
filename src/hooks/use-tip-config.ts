"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getPusherClient } from "@/lib/pusher";
import { isTipCustomizationEnabled } from "@/lib/tip-customization";
import type { ActiveTipConfigResponse } from "@/lib/tip-config-types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export type TipConfigHookState =
  | { status: "disabled" }
  | { status: "loading" }
  | ({ status: "ready" } & ActiveTipConfigResponse);

export function useTipConfig(eventId: string | undefined): TipConfigHookState {
  const [state, setState] = useState<TipConfigHookState>(() =>
    !eventId || !isTipCustomizationEnabled()
      ? { status: "disabled" }
      : { status: "loading" }
  );
  const etagRef = useRef<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!eventId || !isTipCustomizationEnabled()) return;
    try {
      const res = await fetch(`${apiBase()}/tip-config/${eventId}/active`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setState({ status: "ready", mode: "legacy" });
        return;
      }
      const json = (await res.json()) as ActiveTipConfigResponse;
      if (json.mode === "live") {
        etagRef.current = json.etag;
      } else {
        etagRef.current = null;
      }
      setState({ status: "ready", ...json });
    } catch {
      setState({ status: "ready", mode: "legacy" });
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !isTipCustomizationEnabled()) {
      setState({ status: "disabled" });
      return;
    }
    setState({ status: "loading" });
    void fetchConfig();
  }, [eventId, fetchConfig]);

  useEffect(() => {
    if (!eventId || !isTipCustomizationEnabled()) return;

    const client = getPusherClient();
    if (!client) return;

    const channelName = `tip-config-${eventId}`;
    const channel = client.subscribe(channelName);

    const onPublish = (data: { etag?: string }) => {
      if (typeof data?.etag === "string" && data.etag === etagRef.current) {
        return;
      }
      void fetchConfig();
    };

    channel.bind("config.published", onPublish);

    return () => {
      channel.unbind("config.published", onPublish);
      try {
        client.unsubscribe(channelName);
      } catch {
        /* ignore */
      }
    };
  }, [eventId, fetchConfig]);

  return state;
}
