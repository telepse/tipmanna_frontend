"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Check, Loader2, Mail, Shield, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEventRoomInviteAction,
  getEventAccessModeSettingsAction,
  getEventRoomInvitesAction,
  listEventRoomAccessRequestsAction,
  patchEventAccessModeAction,
  resolveEventRoomAccessRequestAction,
  type EventAccessMode,
  type EventRoomAccessFormConfig,
  type EventRoomAccessRequestRow,
} from "@/actions/events";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";

type InviteRow = {
  id: string;
  email: string;
  expiresAt: string;
  used: boolean;
  acceptedAt: string | null;
  createdAt: string;
};

const ACCESS_MODE_LABELS: Record<EventAccessMode, string> = {
  public: "Public",
  invite_only: "Invite only",
  host_code: "Host access code",
  custom_code: "Shared invitation code",
  email_gate: "Email gate",
  community_members: "Community members only",
};

type Props = {
  eventId: string;
  initialAccessMode?: EventAccessMode;
};

export function EventRoomAccessControl({
  eventId,
  initialAccessMode = "public",
}: Props) {
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "premium" });
  const [accessMode, setAccessMode] =
    useState<EventAccessMode>(initialAccessMode);
  const [hostCode, setHostCode] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [emailAutoApprove, setEmailAutoApprove] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [formConfig, setFormConfig] = useState<EventRoomAccessFormConfig>({});
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [eligible, setEligible] = useState(true);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [requests, setRequests] = useState<EventRoomAccessRequestRow[]>([]);
  const [email, setEmail] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await getEventAccessModeSettingsAction(eventId);
      if (!res.success || !res.data) return;
      const data = res.data;
      setAccessMode(data.accessMode ?? initialAccessMode);
      setHostCode(data.accessHostCode?.trim() ?? "");
      setCustomCode(data.accessCustomCode?.trim() ?? "");
      setEmailAutoApprove(data.accessEmailAutoApprove ?? true);
      setRequiresApproval(data.accessRequiresApproval ?? false);
      setFormConfig(
        (data.accessFormConfigJson as EventRoomAccessFormConfig | null) ?? {}
      );
      setCommunityId(data.communityId ?? null);
      const kind = data.submissionKind ?? null;
      setEligible(kind === "event_only" || kind === "event_and_content");
    } finally {
      setLoadingSettings(false);
    }
  }, [eventId, initialAccessMode]);

  const loadInvites = useCallback(async () => {
    if (accessMode !== "invite_only" && accessMode !== "email_gate") return;
    setLoadingInvites(true);
    try {
      const res = await getEventRoomInvitesAction(eventId);
      if (res.success && res.data) {
        const rows = (res.data as { invites?: InviteRow[] }).invites ?? [];
        setInvites(rows);
      }
    } finally {
      setLoadingInvites(false);
    }
  }, [accessMode, eventId]);

  const loadRequests = useCallback(async () => {
    if (accessMode !== "email_gate" || !requiresApproval) {
      setRequests([]);
      return;
    }
    setLoadingRequests(true);
    try {
      const res = await listEventRoomAccessRequestsAction(eventId);
      if (res.success && res.data) {
        setRequests(res.data.requests ?? []);
      }
    } finally {
      setLoadingRequests(false);
    }
  }, [accessMode, eventId, requiresApproval]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const saveAccessMode = async (mode: EventAccessMode) => {
    if (!eligible && mode !== "public") {
      toast.error(
        "Access control is only available for event-only and event-and-content events"
      );
      return;
    }
    if (mode === "community_members" && !communityId) {
      toast.error("Link this event to a community first");
      return;
    }
    if (mode === "host_code" && !hostCode.trim()) {
      toast.error("Enter a host access code");
      return;
    }
    if (mode === "custom_code" && !customCode.trim()) {
      toast.error("Enter a shared invitation code");
      return;
    }

    setBusy("mode");
    try {
      const res = await patchEventAccessModeAction(eventId, {
        accessMode: mode,
        ...(mode === "host_code" ? { accessHostCode: hostCode.trim() } : {}),
        ...(mode === "custom_code"
          ? { accessCustomCode: customCode.trim() }
          : {}),
        ...(mode === "email_gate"
          ? {
              accessEmailAutoApprove: emailAutoApprove,
              accessRequiresApproval: requiresApproval,
              accessFormConfigJson: formConfig,
            }
          : {}),
      });
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
          return;
        }
        toast.error(res.message ?? "Could not update access mode");
        return;
      }
      setAccessMode(mode);
      toast.success(`Access mode set to ${ACCESS_MODE_LABELS[mode]}`);
      if (mode === "invite_only" || mode === "email_gate") void loadInvites();
      if (mode === "email_gate" && requiresApproval) void loadRequests();
    } finally {
      setBusy(null);
    }
  };

  const saveEmailGateOptions = async () => {
    if (accessMode !== "email_gate") return;
    setBusy("email-options");
    try {
      const res = await patchEventAccessModeAction(eventId, {
        accessMode: "email_gate",
        accessEmailAutoApprove: emailAutoApprove,
        accessRequiresApproval: requiresApproval,
        accessFormConfigJson: formConfig,
      });
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
          return;
        }
        toast.error(res.message ?? "Could not save email gate settings");
        return;
      }
      toast.success("Email gate settings saved");
      void loadRequests();
    } finally {
      setBusy(null);
    }
  };

  const sendInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter an email address");
      return;
    }
    setBusy("invite");
    try {
      const res = await createEventRoomInviteAction(eventId, trimmed);
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
          return;
        }
        toast.error(res.message ?? "Could not send invite");
        return;
      }
      toast.success("Invitation sent");
      setEmail("");
      await loadInvites();
    } finally {
      setBusy(null);
    }
  };

  const resolveRequest = async (
    requestId: string,
    action: "approve" | "reject"
  ) => {
    setBusy(`resolve-${requestId}`);
    try {
      const res = await resolveEventRoomAccessRequestAction(
        eventId,
        requestId,
        action
      );
      if (!res.success) {
        toast.error(res.message ?? "Could not update request");
        return;
      }
      toast.success(
        action === "approve" ? "Access approved" : "Request rejected"
      );
      await loadRequests();
    } finally {
      setBusy(null);
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading access settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {SubscriptionPromptModal}

      {!eligible ? (
        <p className="text-muted-foreground rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          Access control is only available for event-only and event-and-content
          events. Content-only rooms stay public.
        </p>
      ) : null}

      <div className="bg-card space-y-4 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-muted-foreground mt-0.5 size-5" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-medium">Event room access mode</p>
              <p className="text-muted-foreground text-sm">
                Restrict who can enter the room, view content, tip, and chat.
              </p>
            </div>
            <Select
              value={accessMode}
              onValueChange={v => void saveAccessMode(v as EventAccessMode)}
              disabled={busy === "mode" || !eligible}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCESS_MODE_LABELS) as EventAccessMode[]).map(
                  mode => (
                    <SelectItem
                      key={mode}
                      value={mode}
                    >
                      {ACCESS_MODE_LABELS[mode]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {accessMode === "host_code" || accessMode === "custom_code" ? (
        <div className="bg-card space-y-3 rounded-lg border p-4">
          <p className="font-medium">Access codes</p>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Host access code"
              value={hostCode}
              onChange={e => setHostCode(e.target.value)}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy === "mode"}
              onClick={() => void saveAccessMode("host_code")}
            >
              Save host code
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Shared invitation code"
              value={customCode}
              onChange={e => setCustomCode(e.target.value)}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy === "mode"}
              onClick={() => void saveAccessMode("custom_code")}
            >
              Save shared code
            </Button>
          </div>
        </div>
      ) : null}

      {accessMode === "email_gate" ? (
        <div className="bg-card space-y-4 rounded-lg border p-4">
          <p className="font-medium">Email gate options</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Auto-approve any email</p>
              <p className="text-muted-foreground text-xs">
                When off, only reserved-list emails are auto-approved unless
                manual approval is required.
              </p>
            </div>
            <Switch
              checked={emailAutoApprove}
              onCheckedChange={setEmailAutoApprove}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Require host approval</p>
              <p className="text-muted-foreground text-xs">
                Submissions stay pending until you approve them.
              </p>
            </div>
            <Switch
              checked={requiresApproval}
              onCheckedChange={setRequiresApproval}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Extra gate fields</p>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(formConfig.collectName)}
                onCheckedChange={v =>
                  setFormConfig(prev => ({
                    ...prev,
                    collectName: Boolean(v),
                  }))
                }
              />
              Collect name
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(formConfig.collectPhone)}
                onCheckedChange={v =>
                  setFormConfig(prev => ({
                    ...prev,
                    collectPhone: Boolean(v),
                  }))
                }
              />
              Collect phone
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(formConfig.collectTicketId)}
                onCheckedChange={v =>
                  setFormConfig(prev => ({
                    ...prev,
                    collectTicketId: Boolean(v),
                  }))
                }
              />
              Collect ticket ID
            </label>
            <div className="space-y-2">
              <Label htmlFor="custom-question">Custom question</Label>
              <Input
                id="custom-question"
                placeholder="Optional question for guests"
                value={formConfig.customQuestion ?? ""}
                onChange={e =>
                  setFormConfig(prev => ({
                    ...prev,
                    customQuestion: e.target.value.trim() || null,
                  }))
                }
                className="max-w-md"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={busy === "email-options"}
            onClick={() => void saveEmailGateOptions()}
          >
            {busy === "email-options" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save email gate settings"
            )}
          </Button>
        </div>
      ) : null}

      {accessMode === "email_gate" && requiresApproval ? (
        <div className="bg-card space-y-4 rounded-lg border p-4">
          <p className="font-medium">Approval queue</p>
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading requests…
            </div>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No pending requests.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {requests.map(req => (
                <li
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p>{req.email}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy === `resolve-${req.id}`}
                      onClick={() => void resolveRequest(req.id, "approve")}
                    >
                      <Check className="mr-1 size-3" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy === `resolve-${req.id}`}
                      onClick={() => void resolveRequest(req.id, "reject")}
                    >
                      <X className="mr-1 size-3" />
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {accessMode === "invite_only" || accessMode === "email_gate" ? (
        <div className="bg-card space-y-4 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="font-medium">Reserved email list</p>
            <p className="text-muted-foreground text-sm">
              Up to 10 invitation emails per event. Used for invite-only access
              and as a reserved list for email gate auto-approval.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Invite by email</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="invite-email"
                type="email"
                placeholder="guest@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="max-w-sm"
              />
              <Button
                type="button"
                disabled={busy === "invite"}
                onClick={() => void sendInvite()}
              >
                {busy === "invite" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="mr-1 size-4" />
                    Send invite
                  </>
                )}
              </Button>
            </div>
          </div>

          {loadingInvites ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading invites…
            </div>
          ) : invites.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invites yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {invites.map(inv => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span>{inv.email}</span>
                  <span className="text-muted-foreground text-xs">
                    {inv.used
                      ? "Accepted"
                      : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
