import Pusher, { type Channel } from "pusher-js";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import {
  tracePaymentAnimation,
  tracePusherRuntimeIdentity,
} from "@/lib/payment-animation-trace";

let pusherSingleton: Pusher | null = null;
const channelRefCounts = new Map<string, number>();

/**
 * Lazy Pusher client (browser only). Returns null if env is missing or init fails.
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") return null;
  // Dual-gate: no shared Pusher client during Explore E2E fixtures (S7).
  if (isExploreE2eFixturesActiveOnClient()) return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    console.error(
      "[Pusher] Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER"
    );
    return null;
  }

  if (!pusherSingleton) {
    try {
      pusherSingleton = new Pusher(key, {
        cluster,
        forceTLS: true,
        authEndpoint: "/api/pusher/auth",
      });

      pusherSingleton.connection.bind("connected", () => {
        console.log("[Pusher] connected");
      });

      pusherSingleton.connection.bind("error", (err: unknown) => {
        console.error("[Pusher] connection error", err);
      });
    } catch (e) {
      console.error("[Pusher] failed to initialize", e);
      pusherSingleton = null;
      return null;
    }
  }

  return pusherSingleton;
}

/**
 * Ref-counted channel subscribe. Returns the shared channel instance or null.
 */
export function subscribeChannel(channelName: string): Channel | null {
  tracePaymentAnimation({
    stage: "channel_acquire_requested",
    channel: channelName,
  });

  const client = getPusherClient();
  if (!client || !channelName) return null;

  try {
    const prev = channelRefCounts.get(channelName) ?? 0;
    let channel: Channel | null = null;

    if (prev === 0) {
      channel = client.subscribe(channelName);
      tracePaymentAnimation({
        stage: "channel_acquired",
        channel: channelName,
        result: "subscribed",
      });
      tracePusherRuntimeIdentity(channelName);
    } else {
      channel = client.channel(channelName);
    }

    if (!channel) return null;
    channelRefCounts.set(channelName, prev + 1);
    tracePaymentAnimation({
      stage: "channel_ref_count_incremented",
      channel: channelName,
      queuePendingCount: prev + 1,
    });
    return channel;
  } catch (e) {
    console.error("[Pusher] subscribeChannel failed", channelName, e);
    return null;
  }
}

/** Release a ref-counted channel subscription; unsubscribes when count hits zero. */
export function unsubscribeChannel(channelName: string): void {
  if (!channelName) return;

  const prev = channelRefCounts.get(channelName) ?? 0;
  const next = Math.max(0, prev - 1);

  if (next === 0) {
    channelRefCounts.delete(channelName);
    tracePaymentAnimation({
      stage: "channel_ref_count_decremented",
      channel: channelName,
      queuePendingCount: 0,
      result: "unsubscribed",
    });
    const client = getPusherClient();
    if (!client) return;
    try {
      client.unsubscribe(channelName);
    } catch (e) {
      console.error("[Pusher] unsubscribeChannel failed", channelName, e);
    }
  } else {
    channelRefCounts.set(channelName, next);
    tracePaymentAnimation({
      stage: "channel_ref_count_decremented",
      channel: channelName,
      queuePendingCount: next,
    });
  }
}

function nudgePusherReconnectIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    const client = getPusherClient();
    if (!client) return;
    const state = client.connection.state;
    if (
      state === "disconnected" ||
      state === "failed" ||
      state === "unavailable"
    ) {
      client.connect();
    }
  } catch {
    /* best-effort */
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      nudgePusherReconnectIfNeeded();
    }
  });

  window.addEventListener("online", () => {
    nudgePusherReconnectIfNeeded();
  });
}
