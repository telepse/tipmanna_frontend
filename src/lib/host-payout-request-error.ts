import type { PayoutRequestReason } from "@/actions/host-payouts";

const REASON_LABEL: Record<Exclude<PayoutRequestReason, "eligible">, string> = {
  profile_incomplete: "Complete your host profile",
  co_owner_outstanding: "Settle co-owner obligations",
  payouts_frozen: "Payouts are temporarily frozen",
  no_balance: "No pending balance",
  cooldown: "Payout cooldown active",
  request_pending: "Request already pending",
};

export function parseHostPayoutRequestError(validationBody: unknown): {
  reasons: PayoutRequestReason[];
  cooldownEndsAt: string | null;
} {
  const body = validationBody as
    | { error?: { reasons?: unknown; cooldownEndsAt?: unknown } }
    | undefined;
  const error = body?.error;
  const reasons = Array.isArray(error?.reasons)
    ? error.reasons.filter(
        (r): r is PayoutRequestReason => typeof r === "string"
      )
    : [];
  const cooldownEndsAt =
    typeof error?.cooldownEndsAt === "string" ? error.cooldownEndsAt : null;
  return { reasons, cooldownEndsAt };
}

export function hostPayoutRequestErrorMessage(
  fallback: string,
  validationBody?: unknown
): string {
  const { reasons, cooldownEndsAt } =
    parseHostPayoutRequestError(validationBody);
  if (reasons.includes("cooldown") && cooldownEndsAt) {
    return `Payout cooldown active until ${new Date(cooldownEndsAt).toLocaleDateString()}`;
  }
  const primary = reasons.find(r => r !== "eligible");
  if (primary && primary in REASON_LABEL) {
    return REASON_LABEL[primary as Exclude<PayoutRequestReason, "eligible">];
  }
  return fallback;
}
