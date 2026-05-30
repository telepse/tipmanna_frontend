// types/tracking.types.ts
export interface UserInfo {
  id: string;
  type: "host" | "tipper" | "visitor" | "anonymous";
  username: string;
  email?: string;
  isAuthenticated: boolean;
  joinedAt?: string;
  lastActivity?: string;
  currentActivity?: string;
}

export interface EventStats {
  totalUsers: number;
  authenticatedUsers: number;
  anonymousUsers: number;
}

export interface PusherTrackingHook {
  activeUsers: UserInfo[];
  isConnected: boolean;
  trackActivity: (activity: string) => void;
  leaveEvent: () => void;
}
