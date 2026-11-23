"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";

import {
  cancelOwnDeletionRequestAction,
  createContentDeletionRequestAction,
  getContentDeletionPreflightAction,
  getDeletionCapabilitiesAction,
  getOwnDeletionRequestAction,
} from "@/actions/deletion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Paragraph } from "@/components/shared/paragraph";
import {
  contentDeletionExplainers,
  formatBlockerSummary,
  isSafeOwnRequestId,
  resolveContentDeletionUiPhase,
  type ContentDeletionType,
  type DeletionBlocker,
  type DeletionCapabilities,
} from "@/lib/content-deletion";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentDeletionType;
  contentId: string;
  contentLabel?: string;
};

export function ContentDeleteRequestDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentLabel,
}: Props) {
  const explain = contentDeletionExplainers(contentType);
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
  const [notFound, setNotFound] = useState(false);
  const [pending, startTransition] = useTransition();

  const phase = useMemo(
    () =>
      resolveContentDeletionUiPhase({
        capabilities,
        preflightOk,
        preflightBlockers: blockers,
        requestStatus,
        hardError,
        notFound,
      }),
    [capabilities, preflightOk, blockers, requestStatus, hardError, notFound]
  );

  const refresh = useCallback(() => {
    if (!open) return;
    startTransition(async () => {
      setHardError(null);
      setNotFound(false);
      const caps = await getDeletionCapabilitiesAction();
      if (!caps.success || !caps.data) {
        setHardError(caps.message || caps.error || "Could not load capabilities");
        return;
      }
      setCapabilities(caps.data);
      if (caps.data.contentDeletionEnabled !== true) {
        setPreflightOk(null);
        setBlockers([]);
        return;
      }
      if (!isSafeOwnRequestId(contentId)) {
        setHardError("Invalid content reference.");
        return;
      }
      const pf = await getContentDeletionPreflightAction({
        type: contentType,
        id: contentId,
      });
      if (pf.httpStatus === 401) {
        setHardError("Host session required. Sign in as host and try again.");
        return;
      }
      if (pf.httpStatus === 403) {
        setHardError(
          "You cannot delete this content. Only the owning host may request deletion."
        );
        return;
      }
      if (pf.httpStatus === 404) {
        setNotFound(true);
        setHardError(null);
        return;
      }
      if (!pf.success || !pf.data) {
        setHardError(pf.message || pf.error || "Preflight failed");
        return;
      }
      setPreflightOk(pf.data.ok);
      setBlockers(Array.isArray(pf.data.blockers) ? pf.data.blockers : []);
    });
  }, [open, contentType, contentId]);

  useEffect(() => {
    if (!open) {
      setAgree(false);
      setInfo(null);
      setHardError(null);
      setRequestId(null);
      setRequestStatus(null);
      setNotFound(false);
      return;
    }
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !requestId || !isSafeOwnRequestId(requestId)) return;
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
  }, [open, requestId, requestStatus]);

  const onSubmit = () => {
    if (!agree) {
      setInfo("Confirm that you understand the consequences before continuing.");
      return;
    }
    startTransition(async () => {
      setInfo(null);
      setHardError(null);
      const res = await createContentDeletionRequestAction({
        type: contentType,
        id: contentId,
        agree: true,
        clientKey: `fe-content-delete-${contentType}-${Date.now()}`,
      });
      if (res.httpStatus === 401) {
        setHardError("Host session required. Sign in as host and try again.");
        return;
      }
      if (res.httpStatus === 403) {
        setHardError(
          "You cannot delete this content. Only the owning host may request deletion."
        );
        return;
      }
      if (res.httpStatus === 404) {
        setNotFound(true);
        return;
      }
      if (!res.success || !res.data) {
        setHardError(res.message || res.error || "Request failed");
        return;
      }
      const id = res.data.requestId;
      if (id && isSafeOwnRequestId(id)) setRequestId(id);
      setRequestStatus(res.data.status ?? null);
      if (res.data.blockers?.length) setBlockers(res.data.blockers);
      setInfo(
        res.data.reused
          ? "Your existing content deletion request was reused."
          : "Content deletion request submitted. Your account is not deleted by this action."
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
      setInfo("Content deletion request cancelled. Content was not removed.");
      refresh();
    });
  };

  const blockerText = formatBlockerSummary(blockers);
  const canSubmit =
    phase === "ready" &&
    agree &&
    !pending &&
    capabilities?.contentDeletionEnabled === true;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{explain.title}</DialogTitle>
          <DialogDescription>
            {contentLabel
              ? `Target: ${contentLabel}. Soft-delete request only — not account deletion, not permanent purge.`
              : "Soft-delete request only — not account deletion, not permanent purge."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-stone-800">
          <ul className="list-disc space-y-2 pl-5">
            {explain.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>

          {phase === "unavailable" ? (
            <Paragraph size="sm">
              Independent content deletion is not currently enabled in this
              environment. Nothing was changed. Try again later or contact
              support.
            </Paragraph>
          ) : null}

          {phase === "not_found" ? (
            <Paragraph size="sm">
              This content was not found or is not owned by your host account.
              Nothing was changed.
            </Paragraph>
          ) : null}

          {phase === "blocked" || phase === "held" ? (
            <div className="space-y-2 rounded-md bg-amber-50 px-3 py-2 text-amber-950">
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
            </Paragraph>
          ) : null}
          {info ? <Paragraph size="sm">{info}</Paragraph> : null}
          {hardError ? (
            <div className="space-y-2 rounded-md bg-red-50 px-3 py-2 text-red-900">
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
              Soft-delete processing for this content has completed. Your host
              account remains active.{" "}
              <Link
                href="/account/delete"
                className="underline underline-offset-2"
              >
                Account deletion is a separate request
              </Link>
              .
            </Paragraph>
          ) : null}

          {capabilities?.contentDeletionEnabled === true &&
          (phase === "ready" || phase === "held" || phase === "blocked") ? (
            <div className="space-y-3 border-t border-stone-200 pt-4">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={agree}
                  onCheckedChange={(v) => setAgree(v === true)}
                  className="mt-0.5"
                />
                <span>
                  I understand this soft-deletes this content only and does not
                  delete my Tipmanna account or permanently purge records.
                </span>
              </label>
              <Button
                type="button"
                variant="destructive"
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                {pending ? "Submitting…" : "Submit content deletion request"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
