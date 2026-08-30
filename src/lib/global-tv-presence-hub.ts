/* eslint-disable @typescript-eslint/no-explicit-any */
import Pusher, { Channel } from "pusher-js";
import type { UserInfo } from "@/types/tracking.types";

type PusherChannelAuthData = {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
};

function apiBase() {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
}

type Listener = {
  onUsers: (users: UserInfo[]) => void;
  onConnected?: (connected: boolean) => void;
};

type BucketState = {
  refCount: number;
  listeners: Set<Listener>;
  pusher: Pusher | null;
  channel: Channel | null;
  latestUsers: UserInfo[];
  getJoinUser: () => UserInfo;
  joinedUserId: string | null;
  joinInFlight: boolean;
  unloadHandler?: () => void;
};

const buckets = new Map<string, BucketState>();

function emitUsers(b: BucketState) {
  const snap = [...b.latestUsers];
  for (const l of b.listeners) l.onUsers(snap);
}

function emitConnected(b: BucketState, ok: boolean) {
  for (const l of b.listeners) l.onConnected?.(ok);
}

async function joinReq(tvId: string, userInfo: UserInfo) {
  await fetch(`${apiBase()}/tracking/global-tv/${tvId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInfo }),
  });
}

async function leaveReq(tvId: string, userId: string) {
  await fetch(`${apiBase()}/tracking/global-tv/${tvId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

function beaconLeave(tvId: string, userId: string) {
  const url = `${apiBase()}/tracking/global-tv/${tvId}/leave`;
  const payload = JSON.stringify({ userId });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      url,
      new Blob([payload], { type: "application/json" })
    );
    return;
  }
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(err => console.warn("globalTvPresence leave fallback failed:", err));
}

async function flushJoin(tvId: string, b: BucketState) {
  const ui = b.getJoinUser();
  const uid = ui?.id ?? "";
  if (!uid.trim() || b.joinInFlight) return;

  try {
    b.joinInFlight = true;
    if (b.joinedUserId && b.joinedUserId !== uid) {
      await leaveReq(tvId, b.joinedUserId).catch(() => undefined);
      b.joinedUserId = null;
    }
    await joinReq(tvId, ui);
    b.joinedUserId = uid;
  } catch (err) {
    console.error("Failed to join global TV:", err);
  } finally {
    b.joinInFlight = false;
  }
}

function parsePresenceMembers(members: any): UserInfo[] {
  const users: UserInfo[] = [];

  const pushMember = (member: any) => {
    const info = member?.info ?? member?.user_info ?? member ?? {};
    const id = String(member?.id ?? info?.id ?? "").trim();
    if (!id) return;
    users.push({
      id,
      type: info.type ?? "anonymous",
      username: info.username ?? "Anonymous",
      isAuthenticated: Boolean(info.isAuthenticated),
      joinedAt: info.joinedAt,
      currentActivity: info.currentActivity,
      lastActivity: info.lastActivity,
    });
  };

  if (typeof members?.each === "function") {
    members.each((member: any) => pushMember(member));
    return users;
  }

  const raw = members?.members ?? members ?? {};
  if (typeof raw === "object") {
    Object.values(raw).forEach((member: any) => pushMember(member));
  }

  return users;
}

function wirePusher(tvId: string, b: BucketState) {
  if (b.pusher) return;

  if (typeof window !== "undefined") {
    const unloadHandler = () => {
      const bx = buckets.get(tvId);
      const uid =
        bx?.joinedUserId?.trim?.() ?? bx?.getJoinUser?.()?.id?.trim?.() ?? "";
      if (!uid.trim()) return;
      beaconLeave(tvId, uid);
    };
    b.unloadHandler = unloadHandler;
    window.addEventListener("beforeunload", unloadHandler);
    window.addEventListener("unload", unloadHandler);
  }

  const authUrl = `${apiBase()}/tracking/pusher/auth/global-tv/${encodeURIComponent(tvId)}`;

  const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authorizer: (channel, _options) => ({
      authorize: (socketId, callback) => {
        const ui = b.getJoinUser();
        void fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
            tvId,
            userId: ui?.id ?? "",
            username: ui?.username ?? "Anonymous User",
          }),
        })
          .then(res => {
            if (!res.ok) {
              throw new Error(`Global TV Pusher auth failed (${res.status})`);
            }
            return res.json();
          })
          .then(data => callback(null, data as PusherChannelAuthData))
          .catch(err => callback(err as Error, null));
      },
    }),
  });

  const channelName = `presence-global-tv-${tvId}`;
  const channel = pusher.subscribe(channelName);

  b.pusher = pusher;
  b.channel = channel;

  channel.bind("pusher:subscription_succeeded", (members: any) => {
    const users = parsePresenceMembers(members);
    const bx = buckets.get(tvId);
    if (!bx) return;
    bx.latestUsers = users;
    emitUsers(bx);
  });

  channel.bind("user-joined", (data: any) => {
    const bx = buckets.get(tvId);
    if (!bx) return;
    bx.latestUsers = data.activeUsers ?? bx.latestUsers;
    emitUsers(bx);
  });

  channel.bind("user-left", (data: any) => {
    const bx = buckets.get(tvId);
    if (!bx) return;
    bx.latestUsers = data.activeUsers ?? bx.latestUsers;
    emitUsers(bx);
  });

  channel.bind("user-activity", (data: any) => {
    const bx = buckets.get(tvId);
    if (!bx) return;
    const uidAct = String(data?.userId ?? "");
    const act = String(data?.activity ?? "");
    bx.latestUsers = bx.latestUsers.map(u =>
      u.id === uidAct ? { ...u, currentActivity: act } : u
    );
    emitUsers(bx);
  });

  pusher.connection.bind("connected", () => {
    const bx = buckets.get(tvId);
    if (!bx) return;
    emitConnected(bx, true);
    void flushJoin(tvId, bx);
  });

  pusher.connection.bind("disconnected", () => {
    const bx = buckets.get(tvId);
    if (!bx) return;
    emitConnected(bx, false);
  });
}

export function subscribeGlobalTvPresence(opts: {
  tvId: string;
  /** Must ultimately provide a persistent user id while this tab participates. */
  getJoinUserInfo: () => UserInfo | null | undefined;
  onUsers: (users: UserInfo[]) => void;
  onConnectedChange?: (connected: boolean) => void;
}): () => void {
  const { tvId, getJoinUserInfo, onUsers, onConnectedChange } = opts;

  const safeUser = (): UserInfo =>
    getJoinUserInfo() ?? ({ id: "" } as UserInfo);

  const uidEarly = safeUser()?.id ?? "";
  if (!tvId.trim() || !String(uidEarly).trim()) return () => undefined;

  let b = buckets.get(tvId);

  if (!b) {
    b = {
      refCount: 0,
      listeners: new Set(),
      pusher: null,
      channel: null,
      latestUsers: [],
      getJoinUser: safeUser,
      joinedUserId: null,
      joinInFlight: false,
      unloadHandler: undefined,
    };
    buckets.set(tvId, b);
    wirePusher(tvId, b);
  } else {
    b.getJoinUser = safeUser;
  }

  const listener: Listener = { onUsers, onConnected: onConnectedChange };

  b.refCount++;
  b.listeners.add(listener);
  listener.onUsers([...b.latestUsers]);

  const connectedNow = b.pusher?.connection?.state === "connected";
  listener.onConnected?.(connectedNow);
  if (connectedNow) {
    void flushJoin(tvId, b);
  }

  return () => {
    const bn = buckets.get(tvId);
    if (!bn) return;
    bn.listeners.delete(listener);

    bn.refCount--;
    const leaveId = bn.joinedUserId ?? bn.getJoinUser()?.id ?? "";

    if (bn.refCount > 0) return;

    void (async () => {
      if (bn.unloadHandler && typeof window !== "undefined") {
        window.removeEventListener("beforeunload", bn.unloadHandler);
        window.removeEventListener("unload", bn.unloadHandler);
        bn.unloadHandler = undefined;
      }
      try {
        if (leaveId) await leaveReq(tvId, leaveId);
      } catch {
        beaconLeave(tvId, leaveId);
      }
      if (bn.channel) {
        try {
          bn.channel.unbind_all();
          bn.channel.unsubscribe();
        } catch {
          /* noop */
        }
      }
      if (bn.pusher) {
        try {
          bn.pusher.disconnect();
        } catch {
          /* noop */
        }
      }
      buckets.delete(tvId);
    })();
  };
}

export async function globalTvPresenceTrackActivity(
  tvId: string,
  activity: string
) {
  const b = buckets.get(tvId);
  if (!b) return;

  try {
    const ui = b.getJoinUser();
    await fetch(`${apiBase()}/tracking/global-tv/${tvId}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: ui?.id ?? "", activity }),
    });
  } catch (err) {
    console.error("Failed to track global TV activity:", err);
  }
}

export function globalTvPresenceBeaconLeave(tvId: string, userId: string) {
  beaconLeave(tvId, userId);
}
