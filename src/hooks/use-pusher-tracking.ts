// hooks/usePusherTracking.ts
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Pusher, { Channel } from "pusher-js";
import { UserInfo, PusherTrackingHook } from "@/types/tracking.types";
import { getAuthToken } from "@/lib/getAuthToken";

interface UsePusherTrackingProps {
  eventId: string;
  userInfo: UserInfo;
}

interface PusherMember {
  id: string;
  type: UserInfo["type"];
  username: string;
  isAuthenticated: boolean;
  joinedAt: string;
}

interface PusherSubscriptionSucceeded {
  members: Record<string, PusherMember>;
  count: number;
  me: {
    id: string;
    info: PusherMember;
  };
}

interface UserJoinedEvent {
  user: UserInfo;
  activeUsers: UserInfo[];
}

interface UserLeftEvent {
  user: UserInfo;
  activeUsers: UserInfo[];
}

interface UserActivityEvent {
  userId: string;
  activity: string;
  user: UserInfo;
}

interface ConnectionStateChange {
  current: string; // e.g., "connected", "connecting", "unavailable"
  previous: string;
}

export const usePusherTracking = ({
  eventId,
  userInfo,
}: UsePusherTrackingProps): PusherTrackingHook => {
  const [activeUsers, setActiveUsers] = useState<UserInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const channelNameRef = useRef<string>("");
  const isJoiningRef = useRef(false);

  // Join event function
  const joinEvent = useCallback(async () => {
    if (isJoiningRef.current) return;

    isJoiningRef.current = true;
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tracking/events/${eventId}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userInfo }),
        }
      );
    } catch (error) {
      console.error("[PusherTracking] Failed to join event:", error);
    } finally {
      isJoiningRef.current = false;
    }
  }, [eventId, userInfo]);

  // Leave event function
  const leaveEvent = useCallback(async () => {
    try {
      // Remove current user from local state immediately
      setActiveUsers(prev => prev.filter(user => user.id !== userInfo.id));

      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tracking/events/${eventId}/leave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userInfo.id }),
        }
      );
    } catch (error) {
      console.error("[PusherTracking] Failed to leave event:", error);
    }
  }, [eventId, userInfo.id]);

  // Add this right after leaveEvent
  const leaveEventBeacon = useCallback(() => {
    try {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tracking/events/${eventId}/leave`;
      const payload = JSON.stringify({ userId: userInfo.id });

      // Preferred: sendBeacon
      if (navigator && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
      }

      // Fallback: fetch with keepalive (supported in modern browsers)
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(err => {
        // swallow; nothing we can do reliably during unload
        console.warn("[PusherTracking] leaveEventBeacon fallback failed:", err);
      });
    } catch (err) {
      console.warn("[PusherTracking] leaveEventBeacon error:", err);
    }
  }, [eventId, userInfo.id]);

  // Track activity function
  const trackActivity = useCallback(
    async (activity: string) => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tracking/events/${eventId}/activity`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userInfo.id,
              activity,
            }),
          }
        );
      } catch (error) {
        console.error("[PusherTracking] Failed to track activity:", error);
      }
    },
    [eventId, userInfo.id]
  );

  // Initialize Pusher and event tracking
  useEffect(() => {
    const bearer = getAuthToken()?.trim();
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tracking/pusher/auth/${eventId}`,
      auth: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {},
    });

    pusherRef.current = pusher;
    const channelName = `presence-event-${eventId}`;
    channelNameRef.current = channelName;

    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Connection established
    channel.bind(
      "pusher:subscription_succeeded",
      (members: PusherSubscriptionSucceeded) => {
        const initialUsers: UserInfo[] = Object.values(members.members).map(
          m => ({
            id: m.id,
            type: m.type,
            username: m.username,
            isAuthenticated: m.isAuthenticated,
            joinedAt: m.joinedAt,
          })
        );

        setActiveUsers(initialUsers);

        if (!initialUsers.find(u => u.id === userInfo.id)) {
          joinEvent();
        }
      }
    );

    // User joined event
    channel.bind("user-joined", (data: UserJoinedEvent) => {
      setActiveUsers(data.activeUsers);
    });

    // User left event
    channel.bind("user-left", (data: UserLeftEvent) => {
      setActiveUsers(data.activeUsers);
    });

    // User activity update
    channel.bind("user-activity", (data: UserActivityEvent) => {
      setActiveUsers(prev =>
        prev.map(user =>
          user.id === data.userId
            ? {
                ...user,
                currentActivity: data.activity,
                lastActivity: new Date().toISOString(),
              }
            : user
        )
      );
    });

    // Handle connection state changes
    pusher.connection.bind("state_change", (states: ConnectionStateChange) => {
      setIsConnected(states.current === "connected");
    });

    // Handle connection errors
    pusher.connection.bind("error", (error: ConnectionStateChange) => {
      console.error("[PusherTracking] connection error:", error);
      setIsConnected(false);
    });

    // --- NEW: unload/unmount handlers to guarantee a leave signal on tab close / refresh ---
    const handleUnload = () => {
      // Use beacon variant (guaranteed/fired on unload)
      leaveEventBeacon();

      // Also attempt to update local state quickly (not required but helpful)
      setActiveUsers(prev => prev.filter(user => user.id !== userInfo.id));
    };

    // Register both unload and beforeunload (some browsers prefer unload)
    window.addEventListener("unload", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    // Cleanup on unmount
    return () => {
      // Also call beacon in cleanup as a last attempt (useful when React unmounts component)
      try {
        leaveEventBeacon();
      } catch (err) {
        // ignore
      }

      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }

      window.removeEventListener("unload", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [eventId, joinEvent, leaveEvent, userInfo.id, leaveEventBeacon]);

  return {
    activeUsers,
    isConnected,
    trackActivity,
    leaveEvent,
  };
};
