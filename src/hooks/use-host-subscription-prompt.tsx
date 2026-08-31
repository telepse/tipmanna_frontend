"use client";

import { useCallback, useState } from "react";
import { toast } from "react-toastify";

import { HostSubscriptionModal } from "@/components/dashboard/host-subscription-modal";
import {
  isSubscriptionLapsedError,
  isSubscriptionRequiredError,
  subscriptionActionErrorMessage,
} from "@/lib/host-subscription-errors";

type ActionResultLike = {
  success?: boolean;
  message?: string | null;
  validationBody?: unknown;
};

type Options = {
  /** Default tier when opening from a generic write guard. */
  focusTier?: "premium" | "community";
};

/**
 * Opens the reusable subscribe/renew modal when host plan writes return
 * SUBSCRIPTION_LAPSED or SUBSCRIPTION_REQUIRED.
 */
export function useHostSubscriptionPrompt(options?: Options) {
  const defaultFocusTier = options?.focusTier ?? "premium";
  const [open, setOpen] = useState(false);
  const [focusTier, setFocusTier] = useState<"premium" | "community">(
    defaultFocusTier
  );
  const [renewLabel, setRenewLabel] = useState<string | undefined>();
  const [title, setTitle] = useState<string | undefined>();
  const [description, setDescription] = useState<string | undefined>();

  const openForLapsed = useCallback(
    (tier: "premium" | "community" = "premium") => {
      setFocusTier(tier);
      setRenewLabel("Renew plan");
      setTitle("Renew your host plan");
      setDescription(
        "Your subscription has lapsed. Renew to unlock Growth and Community features."
      );
      setOpen(true);
    },
    []
  );

  const openForRequired = useCallback(
    (tier: "premium" | "community" = "premium") => {
      setFocusTier(tier);
      setRenewLabel(undefined);
      setTitle("Choose a host plan");
      setDescription(
        "Subscribe to Host Growth or Community to use this feature."
      );
      setOpen(true);
    },
    []
  );

  const handleSubscriptionActionError = useCallback(
    (
      result: ActionResultLike,
      opts?: { focusTier?: "premium" | "community"; toastFallback?: boolean }
    ): boolean => {
      if (result.success) return false;

      const tier = opts?.focusTier ?? defaultFocusTier;

      if (isSubscriptionLapsedError(result.validationBody)) {
        openForLapsed(tier);
        return true;
      }

      if (isSubscriptionRequiredError(result.validationBody)) {
        openForRequired(tier);
        return true;
      }

      if (opts?.toastFallback !== false) {
        toast.error(
          subscriptionActionErrorMessage(
            result.validationBody,
            result.message ?? "Action failed"
          )
        );
      }

      return false;
    },
    [defaultFocusTier, openForLapsed, openForRequired]
  );

  const SubscriptionPromptModal = (
    <HostSubscriptionModal
      open={open}
      onOpenChange={setOpen}
      focusTier={focusTier}
      renewLabel={renewLabel}
      title={title}
      description={description}
    />
  );

  return {
    handleSubscriptionActionError,
    openForLapsed,
    openForRequired,
    SubscriptionPromptModal,
  };
}
