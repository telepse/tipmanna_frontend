import { getDeviceKey } from "@/lib/getAuthToken";

/** Must match backend SIGNUP_SURFACES (excluding unknown). */
export type SignupSurface =
  | "sign_up_page"
  | "sign_in_page"
  | "create_dialog"
  | "host_auth_modal"
  | "wizard_bridge"
  | "invite_modal"
  | "event_room"
  | "event_inline"
  | "tv_profile"
  | "visitor_profile"
  | "explore"
  | "community_hub"
  | "community_join"
  | "community_picker"
  | "side_chick"
  | "comment_drawer"
  | "creator_profile"
  | "pricing"
  | "partner"
  | "reminder"
  | "push_prompt"
  | "notifications"
  | "cohost_invite"
  | "cohost_sign_in"
  | "tiplink";

export type SignupAttributionPayload = {
  deviceKey: string;
  signupSurface: SignupSurface;
};

export function buildSignupAttributionPayload(
  signupSurface: SignupSurface
): SignupAttributionPayload {
  return {
    deviceKey: getDeviceKey(),
    signupSurface,
  };
}
