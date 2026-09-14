export type EventRoomAccessMode =
  | "public"
  | "invite_only"
  | "host_code"
  | "custom_code"
  | "email_gate"
  | "community_members";

export function isRestrictedEventRoomAccess(
  mode: string | undefined
): mode is Exclude<EventRoomAccessMode, "public"> {
  return Boolean(mode && mode !== "public");
}

export function isEventRoomAccessDenied(access?: {
  accessMode?: string;
  allowed?: boolean;
}): boolean {
  if (!access) return false;
  if (!isRestrictedEventRoomAccess(access.accessMode)) return false;
  return access.allowed === false;
}
