"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

/**
 * Returns the current host user's ID from Redux state.
 * Returns null if no user is logged in or if the user is not a host.
 */
export function useHostID(): string | null {
  const user = useSelector((state: RootState) => state.auth.user);

  // Only return ID if user exists and role is HOST
  if (user && user.role === "HOST") {
    return user.id;
  }

  return null;
}
