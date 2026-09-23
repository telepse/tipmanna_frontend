/** After guest Start community SignInDialog success. */
export type StartCommunityGuestModalRole = "HOST" | "TIPPER";

export type StartCommunityAfterGuestModalAction = "openForm" | "resumeHostAuth";

/**
 * HOST sign-up/sign-in in the modal → open interest form (do not use stale canWriteAsHost).
 * TIPPER tab → HostUpgrade / host sign-in path.
 */
export function resolveStartCommunityAfterGuestModal(
  role: StartCommunityGuestModalRole
): StartCommunityAfterGuestModalAction {
  return role === "HOST" ? "openForm" : "resumeHostAuth";
}

export const START_COMMUNITY_CHECKING_HOST_LABEL = "Checking host account…";
