import type { RootState } from "@/redux/store";

type AuthUser = RootState["auth"]["user"];

/** Guest / temporary visitor accounts cannot perform tipper-only actions. */
export function isVisitorAccount(user: AuthUser | null | undefined): boolean {
  return user?.role === "VISITOR";
}

/** True when the user must sign in or upgrade from a guest account. */
export function needsTipperSignIn(
  user: AuthUser | null | undefined,
  isAuthenticated: boolean
): boolean {
  if (!isAuthenticated || !user) return true;
  return isVisitorAccount(user);
}
