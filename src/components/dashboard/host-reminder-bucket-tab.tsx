"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  datetimeLocalToUtcIso,
  utcIsoToDatetimeLocal,
} from "@/lib/datetime-local";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCommunityReminderPostAction,
  previewCommunityReminderPostAction,
  searchReminderEnforcementsAction,
} from "@/actions/reminder-bucket";
import {
  getCommunityEmailBlastStatusAction,
  requestCommunityEmailBlastAction,
  submitCommunityEmailBlastCopyAction,
  submitCommunityEmailBlastPaymentAction,
} from "@/actions/host-email-blast";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { toast } from "react-toastify";
import type { RootState } from "@/redux/store";

type Props = { communityId: string };

type EnforcementRow = {
  id: string;
  title: string;
  scheduledAt: string;
  kind?: string;
};

function derivedKind(row: EnforcementRow): string {
  return row.kind === "VIDEO" ? "TV_VIDEO" : "TV_PROGRAM";
}

export function HostReminderBucketTab({ communityId }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selected, setSelected] = useState<EnforcementRow | null>(null);
  const [options, setOptions] = useState<EnforcementRow[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelPush, setChannelPush] = useState(true);
  const [channelEmail, setChannelEmail] = useState(false);
  const [emailBlastStatus, setEmailBlastStatus] = useState<string | null>(null);
  const [hasSentBlast, setHasSentBlast] = useState(false);
  const [quotedAmountGbp, setQuotedAmountGbp] = useState<string | null>(null);
  const [requestingEmail, setRequestingEmail] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingCopy, setSubmittingCopy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewCounts, setPreviewCounts] = useState<{
    recipientCount: number;
    channelCounts: { inApp: number; push: number; email: number };
  } | null>(null);
  const [emailTitle, setEmailTitle] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [declineReason, setDeclineReason] = useState<string | null>(null);
  const authUser = useSelector((s: RootState) => s.auth.user);

  const emailUnlockedForReminders = hasSentBlast;

  const landingUrl = useMemo(
    () =>
      selected
        ? getPublicAbsoluteUrl(`/c/${communityId}/program/${selected.id}`)
        : null,
    [communityId, selected]
  );

  const refreshEmailBlastStatus = useCallback(async () => {
    const res = await getCommunityEmailBlastStatusAction(communityId);
    if (res.success && res.data?.request) {
      setEmailBlastStatus(res.data.request.status);
      setHasSentBlast(Boolean(res.data.hasSentBlast));
      setQuotedAmountGbp(res.data.request.quotedAmountGbp);
      setDeclineReason(res.data.request.declineReason ?? null);
      if (res.data.request.emailTitle) {
        setEmailTitle(res.data.request.emailTitle);
      }
      if (res.data.request.emailBody) {
        setEmailBody(res.data.request.emailBody);
      }
    } else if (res.success) {
      setEmailBlastStatus(null);
      setHasSentBlast(Boolean(res.data?.hasSentBlast));
      setQuotedAmountGbp(null);
      setDeclineReason(null);
    }
  }, [communityId]);

  const loadEnforcements = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const res = await searchReminderEnforcementsAction(
        "community",
        communityId
      );
      if (!res.success || !res.data) {
        setOptions([]);
        return;
      }
      setOptions(res.data.enforcements ?? []);
    } catch {
      setOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void loadEnforcements();
  }, [loadEnforcements]);

  useEffect(() => {
    void refreshEmailBlastStatus();
  }, [refreshEmailBlastStatus]);

  useEffect(() => {
    setSelected(null);
    setPreviewCounts(null);
  }, [communityId]);

  const requestEmailUnlock = async () => {
    setRequestingEmail(true);
    try {
      const res = await requestCommunityEmailBlastAction(communityId);
      if (!res.success) {
        throw new Error(res.message ?? "Could not send request");
      }
      setEmailBlastStatus(res.data?.request.status ?? "requested");
      toast.success(
        res.data?.alreadyOpen
          ? "Email blast request already open"
          : "Request sent to superadmin"
      );
      await refreshEmailBlastStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRequestingEmail(false);
    }
  };

  const submitPayment = async (file: File) => {
    setSubmittingPayment(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const res = await submitCommunityEmailBlastPaymentAction(
        communityId,
        formData
      );
      if (!res.success) {
        throw new Error(res.error ?? "Payment submission failed");
      }
      toast.success("Payment receipt submitted");
      await refreshEmailBlastStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment submission failed");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const submitCopy = async () => {
    if (!emailTitle.trim() || !emailBody.trim()) {
      toast.error("Email title and body required");
      return;
    }
    setSubmittingCopy(true);
    try {
      const res = await submitCommunityEmailBlastCopyAction(
        communityId,
        emailTitle,
        emailBody
      );
      if (!res.success) {
        throw new Error(res.error ?? "Could not submit copy");
      }
      toast.success("Email copy submitted for approval");
      await refreshEmailBlastStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit copy");
    } finally {
      setSubmittingCopy(false);
    }
  };

  const previewRecipients = async () => {
    const channels: Array<"in_app" | "push" | "email"> = [];
    if (channelInApp) channels.push("in_app");
    if (channelPush) channels.push("push");
    if (channelEmail) channels.push("email");
    if (channels.length === 0) {
      toast.error("Select at least one channel to preview");
      return;
    }
    setPreviewing(true);
    try {
      const res = await previewCommunityReminderPostAction(
        communityId,
        channels
      );
      if (!res.success || !res.data) {
        throw new Error(res.error ?? "Preview failed");
      }
      setPreviewCounts(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const pickEnforcement = (row: EnforcementRow) => {
    setSelected(row);
    setTitle(row.title);
    setScheduledAt(utcIsoToDatetimeLocal(row.scheduledAt));
  };

  const submit = async () => {
    if (!authUser?.id) {
      toast.error("Sign in required");
      return;
    }
    if (!selected) {
      toast.error(
        "Please select an enforced video or program before sending reminder broadcast."
      );
      return;
    }
    if (!title.trim() || !scheduledAt) {
      toast.error("Title and schedule time required");
      return;
    }
    const channels: Array<"in_app" | "push" | "email"> = [];
    if (channelInApp) channels.push("in_app");
    if (channelPush) channels.push("push");
    if (channelEmail) channels.push("email");
    if (channels.length === 0) {
      toast.error("Select at least one broadcast channel");
      return;
    }
    setBusy(true);
    try {
      const res = await createCommunityReminderPostAction(communityId, {
        title,
        body,
        scheduledAt: datetimeLocalToUtcIso(scheduledAt),
        enforcementId: selected.id,
        kind: derivedKind(selected),
        channels,
      });
      if (!res.success) {
        throw new Error(res.error ?? res.message ?? "Failed");
      }
      toast.success("Reminder post created");
      setTitle("");
      setBody("");
      setScheduledAt("");
      setSelected(null);
      setPreviewCounts(null);
      void loadEnforcements();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not create reminder post"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-muted-foreground text-sm">
        Broadcast reminders linked to an approved community program or video.
      </p>

      <div className="space-y-2">
        <Label>Enforced program or video</Label>
        <Select
          {...(selected ? { value: selected.id } : {})}
          onValueChange={id => {
            const row = options.find(o => o.id === id);
            if (row) pickEnforcement(row);
          }}
          disabled={optionsLoading || options.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                optionsLoading
                  ? "Loading enforcements…"
                  : options.length === 0
                    ? "No approved enforcements for this community"
                    : "Choose an enforced program or video"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {options.map(row => (
              <SelectItem
                key={row.id}
                value={row.id}
                textValue={row.title}
              >
                <span className="block max-w-[min(100vw-4rem,28rem)] truncate font-medium">
                  {row.title}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {derivedKind(row)} ·{" "}
                  {new Date(row.scheduledAt).toLocaleString()}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {landingUrl ? (
        <div className="bg-muted/30 rounded-md border p-3 text-sm">
          <p className="font-medium">Landing preview</p>
          <p className="text-muted-foreground mt-1 text-xs break-all">
            {landingUrl}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="reminder-title">Title</Label>
        <Input
          id="reminder-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminder-body">Body (optional)</Label>
        <Input
          id="reminder-body"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Broadcast channels</Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={channelInApp}
              onCheckedChange={v => setChannelInApp(v === true)}
            />
            In-app
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={channelPush}
              onCheckedChange={v => setChannelPush(v === true)}
            />
            Push
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={channelEmail}
              disabled={!emailUnlockedForReminders}
              onCheckedChange={v => setChannelEmail(v === true)}
            />
            Email
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={previewing}
            onClick={() => void previewRecipients()}
          >
            {previewing ? "Previewing…" : "Preview recipient counts"}
          </Button>
          {previewCounts ? (
            <p className="text-muted-foreground text-xs">
              Audience: {previewCounts.recipientCount} · In-app:{" "}
              {previewCounts.channelCounts.inApp} · Push:{" "}
              {previewCounts.channelCounts.push} · Email:{" "}
              {previewCounts.channelCounts.email}
            </p>
          ) : null}
        </div>
      </div>

      {!emailUnlockedForReminders ? (
        <div className="bg-muted/30 space-y-3 rounded-md border p-3 text-sm">
          <p>
            Community email blasts are a paid, superadmin-approved workflow.
            Reminder-post email unlocks after your commercial blast is sent.
          </p>
          {!emailBlastStatus ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={requestingEmail}
              onClick={() => void requestEmailUnlock()}
            >
              {requestingEmail
                ? "Sending…"
                : "Request email blast from superadmin"}
            </Button>
          ) : null}
          {emailBlastStatus === "quoted" && quotedAmountGbp ? (
            <div className="space-y-2">
              <p>
                Quote: <strong>£{quotedAmountGbp}</strong>. Upload your payment
                receipt to continue.
              </p>
              <Input
                type="file"
                accept="image/*,application/pdf"
                disabled={submittingPayment}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void submitPayment(file);
                }}
              />
            </div>
          ) : null}
          {emailBlastStatus === "paid_submitted" ? (
            <p className="text-muted-foreground text-xs">
              Payment submitted — waiting for superadmin to confirm receipt.
            </p>
          ) : null}
          {emailBlastStatus === "unlocked" ? (
            <div className="space-y-2">
              {declineReason ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Copy needs changes: {declineReason}
                </p>
              ) : null}
              <Label htmlFor="blast-email-title">Commercial email title</Label>
              <Input
                id="blast-email-title"
                value={emailTitle}
                onChange={e => setEmailTitle(e.target.value)}
              />
              <Label htmlFor="blast-email-body">Commercial email body</Label>
              <Textarea
                id="blast-email-body"
                rows={4}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                disabled={submittingCopy}
                onClick={() => void submitCopy()}
              >
                {submittingCopy ? "Submitting…" : "Submit copy for approval"}
              </Button>
            </div>
          ) : null}
          {emailBlastStatus === "pending_approval" ? (
            <p className="text-muted-foreground text-xs">
              Copy submitted — waiting for superadmin to approve and send.
            </p>
          ) : null}
          {emailBlastStatus ? (
            <p className="text-muted-foreground text-xs">
              Current request status: {emailBlastStatus.replace(/_/g, " ")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Commercial email blast completed — you may include email on reminder
          posts.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="reminder-scheduled">Scheduled at</Label>
        <Input
          id="reminder-scheduled"
          type="datetime-local"
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
        />
      </div>

      <Button
        type="button"
        disabled={busy || !selected}
        onClick={() => void submit()}
      >
        {busy ? "Creating…" : "Create reminder post"}
      </Button>
    </div>
  );
}
