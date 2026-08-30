// components/live-user-tracker.tsx
"use client";

import { UserInfo } from "@/types/tracking.types";

interface LiveUserTrackerProps {
  activeUsers: UserInfo[];
  isConnected: boolean;
  onActivityChange: (activity: string) => void;
}

export const LiveUserTracker = ({
  activeUsers,
  isConnected,
  onActivityChange,
}: LiveUserTrackerProps) => {
  // Calculate stats directly from activeUsers
  const authenticatedUsers = activeUsers.filter(u => u.isAuthenticated).length;
  const anonymousUsers = activeUsers.filter(u => !u.isAuthenticated).length;
  const totalUsers = activeUsers.length;

  const handleActivityClick = (activity: string) => {
    onActivityChange(activity);
  };

  return (
    <div className="live-user-tracker rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      {/* Connection Status */}
      <div className="connection-status mb-4 flex items-center gap-2 border-b border-gray-200 pb-4">
        <span
          className={`h-3 w-3 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm font-medium">
          {isConnected ? "Live Tracking" : "Disconnected"}
        </span>
        <span className="ml-auto text-sm font-semibold text-blue-600">
          {totalUsers} online
        </span>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview mb-4 flex gap-4">
        <div className="stat-item text-center">
          <div className="stat-number text-lg font-bold text-blue-600">
            {authenticatedUsers}
          </div>
          <div className="stat-label text-xs text-gray-600">Authenticated</div>
        </div>
        <div className="stat-item text-center">
          <div className="stat-number text-lg font-bold text-green-600">
            {anonymousUsers}
          </div>
          <div className="stat-label text-xs text-gray-600">Anonymous</div>
        </div>
      </div>

      {/* Active Users List */}
      <div className="active-users-list">
        <h4 className="mb-3 text-sm font-semibold text-gray-800">
          Currently Active
        </h4>
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {activeUsers.length > 0 ? (
            activeUsers.map(user => (
              <div
                key={user.id}
                className="user-item flex items-center gap-3 rounded-md bg-gray-50 p-2 transition-colors hover:bg-gray-100"
              >
                <div className="user-avatar flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-info min-w-0 flex-1">
                  <div className="username truncate text-sm font-medium text-gray-900">
                    {user.username}
                  </div>
                  <div className="user-type flex items-center gap-1 text-xs text-gray-500">
                    <span className="capitalize">{user.type}</span>
                    <span>{user.isAuthenticated ? "✓" : "👤"}</span>
                  </div>
                </div>
                {user.currentActivity && (
                  <div className="user-activity">
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 capitalize">
                      {user.currentActivity.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              No active users
            </div>
          )}
        </div>
      </div>

      {/* Activity Buttons */}
      <div className="activity-buttons mt-4 border-t border-gray-200 pt-4">
        <h5 className="mb-2 text-sm font-semibold text-gray-700">
          Report Activity
        </h5>
        <div className="flex flex-wrap gap-2">
          {[
            "viewing_event",
            "browsing_sessions",
            "viewing_performers",
            "sending_tip",
            "watching_stream",
          ].map(activity => (
            <button
              key={activity}
              onClick={() => handleActivityClick(activity)}
              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700 capitalize transition-colors hover:bg-blue-100"
            >
              {activity.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
