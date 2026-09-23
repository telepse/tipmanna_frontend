/** Public join surfaces: member row or community owner counts as already in. */
export function isCommunityAlreadyIn(opts: {
  isMember: boolean;
  viewerHostsCommunity: boolean;
}): boolean {
  return opts.isMember || opts.viewerHostsCommunity;
}
