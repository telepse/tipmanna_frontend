"use client";

import { Bell } from "lucide-react";
import { useNotificationBadge } from "@/hooks/use-notification-badge";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  iconClassName?: string;
  /** dot = count badge only (no bell icon) */
  variant?: "bell" | "dot";
}

export function NotificationBadge({
  className,
  iconClassName,
  variant = "bell",
}: Props) {
  const { unreadCount } = useNotificationBadge();

  if (variant === "dot") {
    if (unreadCount <= 0) return null;
    return (
      <span
        className={cn(
          "bg-primary absolute -top-0.5 -right-0.5 flex min-h-3.5 min-w-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-white",
          className
        )}
      >
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    );
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <Bell className={cn("size-5", iconClassName)} />
      {unreadCount > 0 ? (
        <span className="bg-primary absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </span>
  );
}
