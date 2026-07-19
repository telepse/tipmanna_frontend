import type { RootState } from "@/redux/store";
import { getTipperUsername } from "@/lib/utils";

type AuthUser = RootState["auth"]["user"];

/** Stable internal href for "My account" / sign-in entry points from nav chrome. */
export function getAccountNavHref(
  user: AuthUser,
  isAuthenticated: boolean
): string {
  if (!isAuthenticated || !user) return "/sign-in";
  switch (user.role) {
    case "TIPPER":
      return `/tipper/${user.username}`;
    case "HOST":
      return `/host/${user.eventSlug}`;
    case "VISITOR":
      return user.username ? `/visitor/${user.username}` : "/tv";
    default:
      return "/sign-in";
  }
}

/** Footer / CTA "add or create event" primary href. */
export function getAddEventNavHref(
  user: AuthUser,
  isAuthenticated: boolean
): string {
  if (!isAuthenticated || !user) return "/sign-in";
  switch (user.role) {
    case "TIPPER":
      return `/create-account?email=${encodeURIComponent(user.email)}`;
    case "HOST":
      return "/event-only";
    case "VISITOR":
    default:
      return "/sign-in";
  }
}

/** Dashboard footer "Create event" targets tipper profile or add-event (legacy behavior). */
export function getDashboardFooterCreateHref(
  user: AuthUser,
  isAuthenticated: boolean
): string {
  if (!isAuthenticated || !user) return "/sign-in";
  if (user.role === "TIPPER") return `/tipper/${getTipperUsername(user.email)}`;
  if (user.role === "HOST") return "/event-only";
  return "/sign-in";
}

/** Dashboard footer "My account" (host uses user id in path). */
export function getDashboardFooterAccountHref(
  user: AuthUser,
  isAuthenticated: boolean
): string {
  if (!isAuthenticated || !user) return "/sign-in";
  if (user.role === "TIPPER") return `/tipper/${user.username}`;
  if (user.role === "HOST") return `/host/${user.id}`;
  return "/sign-in";
}
