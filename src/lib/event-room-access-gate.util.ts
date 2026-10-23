/** SSR denied shell has no children; client grant must reload the room page. */
export function shouldReloadRoomAfterAccessGrant(
  allowed: boolean,
  hasChildren: boolean
): boolean {
  return allowed && !hasChildren;
}
