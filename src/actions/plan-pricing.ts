"use server";

import { runServerFetch } from "@/lib/action-fetch";

export type PublicPlanPricing = {
  premium: {
    listMinor: number;
    saleMinor: number;
    percentOff: number;
    stripeCouponId: string | null;
  };
  community: {
    listMinor: number;
    saleMinor: number;
    percentOff: number;
    stripeCouponId: string | null;
  };
  discountActive: boolean;
};

function publicApiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";
  return base.replace(/\/$/, "");
}

export async function getPlanPricingAction() {
  const base = publicApiBase();
  if (!base) {
    return {
      success: false as const,
      error: "Backend API URL is not configured",
    };
  }
  return runServerFetch(
    `${base}/plan-pricing`,
    {
      method: "GET",
      next: { revalidate: 300 },
    },
    "getPlanPricingAction"
  );
}
