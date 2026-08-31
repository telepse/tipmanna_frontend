"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { useSWRConfig } from "swr";

import { hostSubscriptionConfirmAction } from "@/actions/host";
import { useHostAuthOptional } from "@/contexts/host-auth-context";
import { useHostSession } from "@/hooks/use-host-session";

/**
 * Handles Stripe Checkout return query params on any host dashboard route
 * (`/host/:slug?...`), not only pages that mount the pricing panel.
 */
export function HostSubscriptionReturnHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isActive: hostSessionActive, isLoading: hostSessionLoading } =
    useHostSession();
  const { mutate } = useSWRConfig();
  const hostAuth = useHostAuthOptional();
  const handled = useRef<string | null>(null);

  const handleAuthRequiredError =
    hostAuth?.handleAuthRequiredError ??
    ((_result: unknown, _retry?: () => void) => false);
  const requestHostAuth =
    hostAuth?.requestHostAuth ??
    ((_onReady?: () => void) => {
      void _onReady?.();
    });
  const canWriteAsHost = hostAuth?.canWriteAsHost ?? hostSessionActive;

  useEffect(() => {
    const subscriptionParam = searchParams.get("subscription");
    if (!subscriptionParam || hostSessionLoading) return;

    const sessionId = searchParams.get("session_id");
    const queryKey = `${subscriptionParam}:${sessionId ?? ""}:${pathname}`;
    if (handled.current === queryKey) return;
    handled.current = queryKey;

    const clearQuery = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("subscription");
      params.delete("session_id");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    };

    const confirmCheckout = (id: string) => {
      void (async () => {
        try {
          const res = await hostSubscriptionConfirmAction(id);
          if (!res.success) {
            if (handleAuthRequiredError(res, () => confirmCheckout(id))) {
              return;
            }
            toast.error(res.message ?? "Could not confirm subscription.");
            return;
          }
          toast.success("Subscription activated!");
          await mutate("/subscriptions/host/me-capabilities");
        } catch {
          toast.error("Network error confirming subscription.");
        } finally {
          clearQuery();
        }
      })();
    };

    if (subscriptionParam === "success" && sessionId) {
      if (canWriteAsHost) {
        confirmCheckout(sessionId);
      } else {
        requestHostAuth(() => confirmCheckout(sessionId));
      }
      return;
    }

    if (subscriptionParam === "upgraded") {
      toast.success("Upgraded to Community!");
      void mutate("/subscriptions/host/me-capabilities");
      clearQuery();
      return;
    }

    if (subscriptionParam === "upgrade_scheduled") {
      toast.success("Community upgrade scheduled for end of billing period.");
      void mutate("/subscriptions/host/me-capabilities");
      clearQuery();
      return;
    }

    if (subscriptionParam === "cancel") {
      toast.info("Checkout cancelled.");
      clearQuery();
    }
  }, [
    canWriteAsHost,
    handleAuthRequiredError,
    hostSessionLoading,
    mutate,
    pathname,
    requestHostAuth,
    router,
    searchParams,
  ]);

  return null;
}
