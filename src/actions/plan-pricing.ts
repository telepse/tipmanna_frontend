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

export async function getPlanPricingAction() {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
  if (!apiBase) {
    return {
      success: false as const,
      error: "NEXT_PUBLIC_BACKEND_API_URL is not configured",
    };
  }
  return runServerFetch(
    `${apiBase.replace(/\/$/, "")}/plan-pricing`,
    {
      method: "GET",
      next: { revalidate: 300 },
    },
    "getPlanPricingAction"
  );
}
