import type { ServerSessionUser } from "@/lib/getUser";
import type { PublicTipperProfile } from "@/actions/tipper-profile";

/** Owner = signed-in session id matches public profile id (survives slug migration). */
export function isProfileOwner(
  session: ServerSessionUser | null,
  profile: Pick<PublicTipperProfile, "profileId" | "kind">
): boolean {
  if (!session?.id) return false;
  if (profile.kind === "tipper") {
    return session.role === "TIPPER" && session.id === profile.profileId;
  }
  if (profile.kind === "visitor") {
    return session.role === "VISITOR" && session.id === profile.profileId;
  }
  return false;
}
