"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { startHostConnectOnboardingAction } from "@/actions/host-payouts";

/** Handle Stripe Connect return/refresh query params on revenue page. */
export function useStripeConnectReturnHandler(options: {
  slug: string;
  onSynced: () => Promise<unknown>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { slug, onSynced } = options;

  const clearConnectParam = useCallback(() => {
    router.replace(`/host/${slug}/revenue`);
  }, [router, slug]);

  const relinkOnboarding = useCallback(async () => {
    const baseUrl = window.location.origin;
    const returnUrl = `${baseUrl}/host/${slug}/revenue?connect=return`;
    const refreshUrl = `${baseUrl}/host/${slug}/revenue?connect=refresh`;
    const res = await startHostConnectOnboardingAction(returnUrl, refreshUrl);
    if (!res.success || !res.data?.url) {
      toast.error(res.message ?? "Could not refresh Stripe Connect setup");
      clearConnectParam();
      return;
    }
    window.location.href = res.data.url;
  }, [clearConnectParam, slug]);

  const handleConnectQuery = useCallback(async () => {
    const connectParam = searchParams.get("connect");
    if (connectParam === "return") {
      toast.success("Stripe Connect setup updated");
      await onSynced();
      clearConnectParam();
      return;
    }
    if (connectParam === "refresh") {
      toast.info("Refreshing Stripe Connect setup…");
      await relinkOnboarding();
    }
  }, [clearConnectParam, onSynced, relinkOnboarding, searchParams]);

  return { handleConnectQuery };
}
