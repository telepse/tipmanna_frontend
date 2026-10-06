export type HostSubscriptionStatus = "none" | "active" | "lapsed";

export type HostPlanCapabilityKey =
  | "viewPremiumFeatureUi"
  | "usePremiumDashboardActions"
  | "toggleVideoDisplaySettings"
  | "accessTipLayout"
  | "renewSubscription"
  | "subscribeNew"
  | "manageBilling";

export type HostPlanCapabilities = Record<HostPlanCapabilityKey, boolean>;

export type HostSubscriptionMe = {
  tier: "NONE" | "HOST_PREMIUM" | "HOST_COMMUNITY" | string;
  status: HostSubscriptionStatus;
  hasPremiumFeatures: boolean;
  hasActivePremium: boolean;
  subscriptionPeriodEnd: string | null;
  hasStripeSubscription: boolean;
  canRenew: boolean;
  includesPremiumBecauseCommunity?: boolean;
  isTrialing?: boolean;
  trialEndsAt?: string | Date | null;
  trialEligible?: boolean;
  deniedGrowthTools?: string[];
  deniedCommunityTools?: string[];
  capabilities: HostPlanCapabilities;
  history: Array<{
    id: string;
    tier: string;
    amountMinor: number;
    paidAt: string;
    stripeInvoiceId: string;
  }>;
};

/** Mirror of backend HOST_PLAN_CAPABILITIES for offline fallbacks. */
export const HOST_PLAN_CAPABILITIES: Record<
  HostSubscriptionStatus,
  HostPlanCapabilities
> = {
  active: {
    viewPremiumFeatureUi: true,
    usePremiumDashboardActions: true,
    toggleVideoDisplaySettings: true,
    accessTipLayout: true,
    renewSubscription: false,
    subscribeNew: false,
    manageBilling: true,
  },
  lapsed: {
    viewPremiumFeatureUi: true,
    usePremiumDashboardActions: false,
    toggleVideoDisplaySettings: false,
    accessTipLayout: false,
    renewSubscription: true,
    subscribeNew: false,
    manageBilling: true,
  },
  none: {
    viewPremiumFeatureUi: false,
    usePremiumDashboardActions: false,
    toggleVideoDisplaySettings: false,
    accessTipLayout: false,
    renewSubscription: false,
    subscribeNew: true,
    manageBilling: false,
  },
};

export function capabilitiesForStatus(
  status: HostSubscriptionStatus
): HostPlanCapabilities {
  return { ...HOST_PLAN_CAPABILITIES[status] };
}

export function formatGbpMinor(minor: number): string {
  return `£${(minor / 100).toFixed(2)}`;
}
