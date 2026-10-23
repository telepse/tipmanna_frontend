/** SSR denied shell has no children; full navigation must load room payload. */
export function shouldHardReloadRoomAfterAccessGrant(
  allowed: boolean,
  hasChildren: boolean
): boolean {
  return allowed && !hasChildren;
}

/** @deprecated Use shouldHardReloadRoomAfterAccessGrant */
export const shouldReloadRoomAfterAccessGrant =
  shouldHardReloadRoomAfterAccessGrant;
