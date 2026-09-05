import type { RootState } from "@/redux/store";
import { resolveLinkedHostCreatorProfilePath } from "@/lib/post-host-auth-destination";

type AuthUser = RootState["auth"]["user"];

type HostNavContext = {
  linkedHost?: boolean;
  hostEventSlug?: string | null;
  hostUsername?: string | null;
  hostSessionActive?: boolean;
};

function isSignedInAccount(user: AuthUser): boolean {
  return user?.role === "TIPPER" || user?.role === "VISITOR";
}

/** Stable internal href for "My account" / sign-in entry points from nav chrome. */
export function getAccountNavHref(
  user: AuthUser,
  isAuthenticated: boolean,
  hostCtx?: HostNavContext
): string {
  if (!isAuthenticated || !user) return "/sign-in";
  switch (user.role) {
    case "TIPPER": {
      if (hostCtx?.hostSessionActive && hostCtx.hostEventSlug) {
        return `/host/${hostCtx.hostEventSlug}`;
      }
      const profilePath =
        resolveLinkedHostCreatorProfilePath(hostCtx?.hostUsername) ??
        `/tipper/${user.username}`;
      if (hostCtx?.linkedHost && profilePath.startsWith("/@"))
        return profilePath;
      return `/tipper/${user.username}`;
    }
    case "VISITOR":
      return user.username ? `/visitor/${user.username}` : "/tv";
    default:
      return "/sign-in";
  }
}

/**
 * Footer / CTA "add or create event" primary href.
 * Pass `linkedHost: true` when useHostCapability reports a linked host account.
 */
export function getAddEventNavHref(
  user: AuthUser,
  isAuthenticated: boolean,
  linkedHost?: boolean
): string {
  if (!isAuthenticated || !user) return "/sign-in";
  if (user.role === "TIPPER" && linkedHost === true) return "/event-only";
  if (user.role === "TIPPER") {
    return `/sign-up?email=${encodeURIComponent(user.email)}`;
  }
  return "/sign-in";
}

/** Dashboard footer "Create event" — linked hosts use event-only flow. */
export function getDashboardFooterCreateHref(
  user: AuthUser,
  isAuthenticated: boolean,
  linkedHost?: boolean
): string {
  if (!isAuthenticated || !user) return "/sign-in";
  if (user.role === "TIPPER") {
    if (linkedHost) return "/event-only";
    return `/tipper/${user.username}`;
  }
  return "/sign-in";
}

/** Dashboard footer "My account" — host dashboard when host session active. */
export function getDashboardFooterAccountHref(
  user: AuthUser,
  isAuthenticated: boolean,
  hostCtx?: HostNavContext
): string {
  return getAccountNavHref(user, isAuthenticated, hostCtx);
}

export { isSignedInAccount };
