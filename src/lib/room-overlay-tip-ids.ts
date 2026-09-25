import type { PaymentSurface } from "@/lib/analytics-types";

/** Room Enlarge tips stay event_room without paymentChannelId; feature cards still need a channel row id. */
export function resolveChannelTipIdsForSurface(
  tipSurface: PaymentSurface,
  activeChannelId: string | null
): {
  paymentChannelIdForTip: string | null;
  featureCardChannelId: string | null;
} {
  const channelId = activeChannelId?.trim() || null;
  if (tipSurface === "event_room") {
    return {
      paymentChannelIdForTip: null,
      featureCardChannelId: channelId,
    };
  }
  return {
    paymentChannelIdForTip: channelId,
    featureCardChannelId: channelId,
  };
}
