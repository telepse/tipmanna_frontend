"use client";

import { CoOwnerPayoutsClient } from "@/components/co-owner/co-owner-payouts-client";
import { CreatorProfileMetricsCompare } from "@/components/co-owner/creator-profile-metrics-compare";

export function CoOwnerSelfPayoutsSection() {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Co-owner earnings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Videos you were added as co-owner on — paid amounts, outstanding
          balances, and disputes.
        </p>
      </header>
      <CreatorProfileMetricsCompare />
      <CoOwnerPayoutsClient
        mode="hostSession"
        compact
        showPendingTotal
      />
    </section>
  );
}
