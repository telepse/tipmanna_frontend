"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  searchReminderEnforcementsAction,
} from "@/actions/reminder-bucket";
import {
  getCommunityEmailBlastStatusAction,
  requestCommunityEmailBlastAction,
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
  const [emailRecipientCount, setEmailRecipientCount] = useState<number | null>(
    null
  );
  const [requestingEmail, setRequestingEmail] = useState(false);
  const authUser = useSelector((s: RootState) => s.auth.user);

  const landingUrl = useMemo(
    () =>
      selected
        ? getPublicAbsoluteUrl(`/c/${communityId}/program/${selected.id}`)
        : null,
    [communityId, selected]
  );

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
    void (async () => {
      const res = await getCommunityEmailBlastStatusAction(communityId);
      if (res.success && res.data?.request) {
        setEmailBlastStatus(res.data.request.status);
        setEmailRecipientCount(res.data.request.recipientCount);
        if (res.data.request.status === "unlocked") {
          setChannelEmail(true);
        }
      }
    })();
  }, [communityId]);

  const requestEmailUnlock = async () => {
    setRequestingEmail(true);
    try {
      const res = await requestCommunityEmailBlastAction(communityId);
      if (!res.success) {
        throw new Error(res.message ?? "Could not send request");
      }
      setEmailBlastStatus(res.data?.request.status ?? "requested");
      setEmailRecipientCount(res.data?.request.recipientCount ?? null);
      toast.success(
        res.data?.alreadyOpen
          ? "Email blast request already open"
          : "Request sent to superadmin"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRequestingEmail(false);
    }
  };

  useEffect(() => {
    setSelected(null);
  }, [communityId]);

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
          <label className="flex items-center gap-2 text-sm opacity-60">
            <Checkbox
              checked={channelEmail}
              disabled={emailBlastStatus !== "unlocked"}
              onCheckedChange={v => setChannelEmail(v === true)}
            />
            Email
            {emailRecipientCount != null ? (
              <span className="text-muted-foreground text-xs">
                ({emailRecipientCount} recipients)
              </span>
            ) : null}
          </label>
        </div>
        {emailBlastStatus !== "unlocked" ? (
          <div className="bg-muted/30 space-y-2 rounded-md border p-3 text-sm">
            <p>
              Email is an on-demand paid feature. Send a request to superadmin
              to unlock email for your community members and subscribers.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={requestingEmail}
              onClick={() => void requestEmailUnlock()}
            >
              {requestingEmail ? "Sending…" : "Send request to superadmin"}
            </Button>
            {emailBlastStatus ? (
              <p className="text-muted-foreground text-xs">
                Current request status: {emailBlastStatus.replace(/_/g, " ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

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
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "Creating…" : "Create reminder post"}
      </Button>
    </div>
  );
}
