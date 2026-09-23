import type { TipLinkCreateEligibility } from "@/actions/tiplink";
import {
  isSubscriptionLapsedError,
  isSubscriptionRequiredError,
} from "@/lib/host-subscription-errors";

export const TIPLINK_DRAFT_CREATE_TOAST_ID = "tiplink-draft-create";

export function apiSubscriptionRequiredBody(): { error: { code: string } } {
  return { error: { code: "SUBSCRIPTION_REQUIRED" } };
}

export function apiSubscriptionLapsedBody(): { error: { code: string } } {
  return { error: { code: "SUBSCRIPTION_LAPSED" } };
}

/** Pre-gate only when eligibility loaded and host is not entitled (not when GET failed). */
export function shouldPreGateTipLinkCreate(
  eligibility: Pick<TipLinkCreateEligibility, "canCreate"> | null | undefined
): boolean {
  return eligibility != null && eligibility.canCreate === false;
}

export function tipLinkCreateBlockedMessage(
  eligibility: Pick<
    TipLinkCreateEligibility,
    "firstFreeAvailable" | "canCreate"
  >
): string {
  if (eligibility.firstFreeAvailable) {
    return "Your first TipLink is free. Additional TipLinks require Growth or Community.";
  }
  if (eligibility.canCreate) {
    return "You can create TipLinks with your active premium plan.";
  }
  return "Upgrade to Growth or Community to create another TipLink.";
}

type OpenHandlers = {
  openForRequired: (tier?: "premium" | "community") => void;
  openForLapsed: (tier?: "premium" | "community") => void;
  focusTier?: "premium" | "community";
};

/**
 * Opens subscribe/renew modal for TipLink create blocks (pre-check or API body).
 * Returns true when a modal was opened.
 */
export function openTipLinkCreateSubscriptionPrompt(
  opts: {
    eligibility?: Pick<
      TipLinkCreateEligibility,
      "canCreate" | "subscriptionStatus"
    > | null;
    validationBody?: unknown;
  } & OpenHandlers
): boolean {
  const tier = opts.focusTier ?? "premium";

  if (opts.validationBody != null) {
    if (isSubscriptionLapsedError(opts.validationBody)) {
      opts.openForLapsed(tier);
      return true;
    }
    if (isSubscriptionRequiredError(opts.validationBody)) {
      opts.openForRequired(tier);
      return true;
    }
  }

  const eligibility = opts.eligibility;
  if (eligibility && !eligibility.canCreate) {
    if (eligibility.subscriptionStatus === "lapsed") {
      opts.openForLapsed(tier);
    } else {
      opts.openForRequired(tier);
    }
    return true;
  }

  return false;
}
