export type HostSubscriptionTierRedux =
  | "NONE"
  | "HOST_PREMIUM"
  | "HOST_COMMUNITY"
  | undefined;

/** Avoid Redux user clone on every capabilities SWR refetch when tier is unchanged. */
export function shouldDispatchHostSubscriptionTier(
  current: HostSubscriptionTierRedux,
  next: HostSubscriptionTierRedux
): boolean {
  return current !== next;
}
