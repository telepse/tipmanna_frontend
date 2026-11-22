"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";

import {
  cancelOwnDeletionRequestAction,
  createAccountDeletionRequestAction,
  getAccountDeletionPreflightAction,
  getDeletionCapabilitiesAction,
  getOwnDeletionRequestAction,
} from "@/actions/deletion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import {
  formatBlockerSummary,
  isSafeOwnRequestId,
  resolveAccountDeletionUiPhase,
  type DeletionBlocker,
  type DeletionCapabilities,
} from "@/lib/account-deletion";
import type { RootState } from "@/redux/store";

type Props = {
  accountLabel: string;
};

export function AccountDeleteClient({ accountLabel }: Props) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const displayName =
    (authUser as { username?: string; fullName?: string; email?: string } | null)
      ?.username ||
    (authUser as { fullName?: string } | null)?.fullName ||
    (authUser as { email?: string } | null)?.email ||
    accountLabel;

  const [capabilities, setCapabilities] = useState<DeletionCapabilities | null>(
    null
  );
  const [preflightOk, setPreflightOk] = useState<boolean | null>(null);
  const [blockers, setBlockers] = useState<DeletionBlocker[]>([]);
  const [agree, setAgree] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [hardError, setHardError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const phase = useMemo(
    () =>
      resolveAccountDeletionUiPhase({
        capabilities,
        preflightOk,
        preflightBlockers: blockers,
        requestStatus,
        hardError,
      }),
    [capabilities, preflightOk, blockers, requestStatus, hardError]
  );

  const refresh = useCallback(() => {
    startTransition(async () => {
      setHardError(null);
      const caps = await getDeletionCapabilitiesAction();
      if (!caps.success || !caps.data) {
        setHardError(caps.message || caps.error || "Could not load capabilities");
        return;
      }
      setCapabilities(caps.data);

      if (caps.data.accountDeletionEnabled !== true) {
        setPreflightOk(null);
        setBlockers([]);
        return;
      }

      const pf = await getAccountDeletionPreflightAction();
      if (pf.httpStatus === 401) {
        setHardError("Your session expired. Sign in again to continue.");
        return;
      }
      if (!pf.success || !pf.data) {
        setHardError(pf.message || pf.error || "Preflight failed");
        return;
      }
      setPreflightOk(pf.data.ok);
      setBlockers(Array.isArray(pf.data.blockers) ? pf.data.blockers : []);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!requestId || !isSafeOwnRequestId(requestId)) return;
    if (
      requestStatus === "completed" ||
      requestStatus === "cancelled" ||
      requestStatus === "failed" ||
      requestStatus === "blocked"
    ) {
      return;
    }
    const t = window.setInterval(() => {
      startTransition(async () => {
        const res = await getOwnDeletionRequestAction(requestId);
        if (res.httpStatus === 403 || res.httpStatus === 404) {
          setHardError("You cannot view that deletion request.");
          setRequestId(null);
          return;
        }
        if (res.success && res.data?.request?.status) {
          setRequestStatus(String(res.data.request.status));
        }
      });
    }, 4000);
    return () => window.clearInterval(t);
  }, [requestId, requestStatus]);

  const onSubmit = () => {
    if (!agree) {
      setInfo("Confirm that you understand the consequences before continuing.");
      return;
    }
    startTransition(async () => {
      setInfo(null);
      setHardError(null);
      const res = await createAccountDeletionRequestAction({
        agree: true,
        clientKey: `fe-account-delete-${Date.now()}`,
      });
      if (res.httpStatus === 401) {
        setHardError("Your session expired. Sign in again to continue.");
        return;
      }
      if (!res.success || !res.data) {
        setHardError(res.message || res.error || "Request failed");
        return;
      }
      const id = res.data.requestId;
      if (id && isSafeOwnRequestId(id)) {
        setRequestId(id);
      }
      setRequestStatus(res.data.status ?? null);
      if (res.data.blockers?.length) {
        setBlockers(res.data.blockers);
      }
      setInfo(
        res.data.reused
          ? "Your existing account deletion request was reused."
          : "Account deletion request submitted."
      );
      refresh();
    });
  };

  const onCancel = () => {
    if (!requestId || !isSafeOwnRequestId(requestId)) return;
    startTransition(async () => {
      const res = await cancelOwnDeletionRequestAction(requestId);
      if (!res.success) {
        setHardError(res.message || res.error || "Cancel failed");
        return;
      }
      setRequestStatus(res.data?.status ?? "cancelled");
      setInfo("Deletion request cancelled.");
      refresh();
    });
  };

  const blockerText = formatBlockerSummary(blockers);
  const canSubmit =
    phase === "ready" &&
    agree &&
    !pending &&
    capabilities?.accountDeletionEnabled === true;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-[0.14em] text-amber-800/80 uppercase">
          Tipmanna
        </p>
        <Title
          as="h1"
          size="md"
          weight="bold"
        >
          Request account deletion
        </Title>
        <Paragraph size="sm">
          Signed in as <strong>{displayName}</strong>. This page only acts on
          your authenticated account — never on another user&apos;s request.
        </Paragraph>
      </header>

      <section className="space-y-3 border-t border-stone-200 pt-6">
        <Title
          as="h2"
          size="sm"
        >
          What this does
        </Title>
        <Paragraph size="sm">
          Submitting a request starts Tipmanna&apos;s{" "}
          <strong>soft-delete</strong> process: your account is marked for
          deletion, sessions can be revoked, and processing continues in the
          background. This is a request lifecycle with status tracking — not an
          immediate irreversible wipe of every retained record.
        </Paragraph>
        <Paragraph size="sm">
          Financial, legal and co-owner protections may block or hold the
          request until obligations are resolved. Tipmanna does not settle,
          transfer or forfeit balances through this page.
        </Paragraph>
        <Paragraph size="sm">
          <strong>Account deletion is not content deletion.</strong> Removing an
          individual event, channel, tip link or playlist is a separate host
          content flow. This page does not delete other people&apos;s content or
          shared assets you do not solely control.
        </Paragraph>
        <Paragraph size="sm">
          Permanent purge is not available here and cannot be requested from
          this page.
        </Paragraph>
      </section>

      <section className="space-y-3 border-t border-stone-200 pt-6">
        <Title
          as="h2"
          size="sm"
        >
          Status
        </Title>
        {pending && !capabilities ? (
          <Paragraph size="sm">Loading…</Paragraph>
        ) : null}
        {phase === "unavailable" ? (
          <Paragraph size="sm">
            Account deletion is not currently enabled in this environment. Your
            account has not been changed. Try again later or contact support if
            you need help.
          </Paragraph>
        ) : null}
        {phase === "blocked" || phase === "held" ? (
          <div className="space-y-2 rounded-md bg-amber-50 px-4 py-3 text-amber-950">
            <Paragraph size="sm">
              {phase === "blocked"
                ? "Deletion is blocked until the issues below are resolved."
                : "Deletion is on hold pending additional review."}
            </Paragraph>
            {blockerText ? (
              <Paragraph size="sm">{blockerText}</Paragraph>
            ) : null}
          </div>
        ) : null}
        {requestStatus ? (
          <Paragraph size="sm">
            Request status: <strong>{requestStatus}</strong>
            {requestId ? (
              <>
                {" "}
                (your request reference is held only in this session — it is not
                accepted from the URL)
              </>
            ) : null}
          </Paragraph>
        ) : null}
        {info ? <Paragraph size="sm">{info}</Paragraph> : null}
        {hardError ? (
          <div className="space-y-2 rounded-md bg-red-50 px-4 py-3 text-red-900">
            <Paragraph size="sm">{hardError}</Paragraph>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {(phase === "processing" || phase === "pending") && requestId ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel request
          </Button>
        ) : null}
        {phase === "completed" ? (
          <Paragraph size="sm">
            Your account deletion request has completed soft-delete processing.
            Sign-in for this account may no longer work.
          </Paragraph>
        ) : null}
      </section>

      {capabilities?.accountDeletionEnabled === true &&
      (phase === "ready" || phase === "held" || phase === "blocked") ? (
        <section className="space-y-4 border-t border-stone-200 pt-6">
          <Title
            as="h2"
            size="sm"
          >
            Confirm
          </Title>
          <ul className="list-disc space-y-2 pl-5 text-sm text-stone-700">
            <li>You are requesting deletion of this Tipmanna account only.</li>
            <li>
              Individual content deletion is separate and is not performed by
              this form.
            </li>
            <li>
              Outstanding wallet, payout or co-owner issues can block or hold
              the request.
            </li>
            <li>Permanent purge is not offered on this page.</li>
          </ul>
          <label className="flex items-start gap-3 text-sm text-stone-800">
            <Checkbox
              checked={agree}
              onCheckedChange={(v) => setAgree(v === true)}
              className="mt-0.5"
            />
            <span>
              I understand the soft-delete request process and the consequences
              listed above.
            </span>
          </label>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {pending ? "Submitting…" : "Submit account deletion request"}
          </Button>
          {phase !== "ready" ? (
            <Paragraph size="sm">
              Submit stays disabled while a blocking or hold preflight condition
              is active.
            </Paragraph>
          ) : null}
        </section>
      ) : null}

      <p className="text-sm text-stone-500">
        <Link
          href="/explore"
          className="underline underline-offset-2"
        >
          Back to Tipmanna
        </Link>
      </p>
    </div>
  );
}
