export type HostLinkResolutionInput = {
  shouldFetchLink: boolean;
  fetchKey: string | null;
  prevFetchKey: string | null;
  linkLoading: boolean;
};

/**
 * True when a host-link fetch is in flight or the fetch key has not been
 * observed yet. Used during render so capability is "loading" on the first
 * paint after enabled flips true — before useEffect can set linkLoading.
 */
export function isHostLinkResolutionPending(
  input: HostLinkResolutionInput
): boolean {
  if (!input.shouldFetchLink) return false;
  return input.linkLoading || input.fetchKey !== input.prevFetchKey;
}
