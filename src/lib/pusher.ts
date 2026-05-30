import Pusher from "pusher-js";

let pusherSingleton: Pusher | null = null;

/**
 * Lazy Pusher client (browser only). Returns null if env is missing or init fails.
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") return null;

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
