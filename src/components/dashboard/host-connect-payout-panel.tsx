"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HostConnectPayoutStatus } from "@/actions/host-payouts";
import { startHostConnectOnboardingAction } from "@/actions/host-payouts";

type HostConnectPayoutPanelProps = {
  connectPayouts: HostConnectPayoutStatus | null;
  slug: string;
  onRefresh: () => Promise<unknown>;
};

export function HostConnectPayoutPanel({
  connectPayouts,
  slug,
  onRefresh,
}: HostConnectPayoutPanelProps) {
  const [loading, setLoading] = useState(false);

  if (!connectPayouts?.enabled) return null;

  const connect = connectPayouts.connect;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const returnUrl = `${baseUrl}/host/${slug}/revenue?connect=return`;
  const refreshUrl = `${baseUrl}/host/${slug}/revenue?connect=refresh`;
  const bankHint = connect?.profileBankHint;
  const orgBankMismatch = connect?.orgBankMismatch === true;

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const res = await startHostConnectOnboardingAction(returnUrl, refreshUrl);
      if (!res.success || !res.data?.url) {
        toast.error(res.message ?? "Could not start Stripe Connect setup");
        return;
      }
      window.location.href = res.data.url;
    } finally {
      setLoading(false);
    }
  };

  if (connect?.payoutsEnabled) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Stripe Connect</Badge>
          <span className="font-medium">Automated payouts enabled</span>
        </div>
        <p className="mt-1">
          Pending payout requests are processed on the monthly Connect transfer
          run. You do not need to upload receipts for automated transfers.
        </p>
      </div>
    );
  }

  if (orgBankMismatch) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">
              Bank account does not match your profile
            </p>
            <p className="mt-1">
              The bank on Stripe does not match your organisation profile.
              {bankHint?.sortCodeMasked || bankHint?.last4 ? (
                <>
                  {" "}
                  Enter the account ending{" "}
                  <span className="font-medium">
                    {bankHint.last4 ?? "····"}
                  </span>
                  {bankHint.sortCodeMasked ? (
                    <>
                      {" "}
                      with sort code{" "}
                      <span className="font-medium">
                        {bankHint.sortCodeMasked}
                      </span>
                    </>
                  ) : null}{" "}
                  in Stripe, or keep using manual payouts.
                </>
              ) : (
                " Complete Stripe setup with the bank on your profile, or keep using manual payouts."
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void startOnboarding()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Opening…
              </>
            ) : (
              "Continue Stripe setup"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Set up automated payouts</p>
          <p className="mt-1">
            Connect your bank account via Stripe to receive payouts without
            manual receipt confirmation.
          </p>
          {!connect?.accountId ? (
            <p className="mt-2 text-xs">
              Your legal name or organisation name from Settings will be sent to
              Stripe. Correct it in Settings first if it is wrong.
            </p>
          ) : null}
          {bankHint?.sortCodeMasked || bankHint?.last4 ? (
            <p className="mt-2 text-xs">
              Stripe must use this account: sort code{" "}
              <span className="font-medium">
                {bankHint.sortCodeMasked ?? "—"}
              </span>
              , account ending{" "}
              <span className="font-medium">{bankHint.last4 ?? "····"}</span>.
            </p>
          ) : null}
          {connect?.detailsSubmitted && !connect.payoutsEnabled ? (
            <p className="mt-2 text-xs">
              Stripe is still verifying your account. Check back soon or
              continue setup if prompted.
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void startOnboarding()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Opening…
            </>
          ) : connect?.accountId ? (
            "Continue Stripe setup"
          ) : (
            "Set up Stripe Connect"
          )}
        </Button>
      </div>
    </div>
  );
}
