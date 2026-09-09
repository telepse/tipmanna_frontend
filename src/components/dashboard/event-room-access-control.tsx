"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Mail, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createEventRoomInviteAction,
  getEventRoomInvitesAction,
  patchEventAccessModeAction,
  type EventAccessMode,
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
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const toggleAccessMode = async (next: boolean) => {
    const mode: EventAccessMode = next ? "invite_only" : "public";
    setBusy("mode");
    try {
      const res = await patchEventAccessModeAction(eventId, {
        accessMode: mode,
      });
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
          return;
        }
        toast.error(res.message ?? "Could not update access mode");
        return;
      }
      setAccessMode(mode);
      toast.success(
        mode === "invite_only"
          ? "Event room is now invite-only"
          : "Event room is now public"
      );
      if (mode === "invite_only") void loadInvites();
    } finally {
      setBusy(null);
    }
  };

  const saveAccessCodeMode = async (mode: "host_code" | "custom_code") => {
    const code = mode === "host_code" ? hostCode.trim() : customCode.trim();
    if (!code) {
      toast.error("Enter an access code");
      return;
    }
    setBusy("mode");
    try {
      const res = await patchEventAccessModeAction(eventId, {
        accessMode: mode,
        ...(mode === "host_code"
          ? { accessHostCode: code }
          : { accessCustomCode: code }),
      });
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
          return;
        }
        toast.error(res.message ?? "Could not update access mode");
        return;
      }
      setAccessMode(mode);
      toast.success("Access code enabled");
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

  return (
    <div className="space-y-6">
      {SubscriptionPromptModal}
      <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-muted-foreground mt-0.5 size-5" />
          <div>
            <p className="font-medium">Invite-only event room</p>
            <p className="text-muted-foreground text-sm">
              When enabled, only invited guests can enter the room and send
              tips.
            </p>
          </div>
        </div>
        <Switch
          checked={accessMode === "invite_only"}
          disabled={busy === "mode"}
          onCheckedChange={v => void toggleAccessMode(v)}
        />
      </div>

      <div className="bg-card space-y-3 rounded-lg border p-4">
        <p className="font-medium">Access code (Growth+)</p>
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
            onClick={() => void saveAccessCodeMode("host_code")}
          >
            Enable host code
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
            onClick={() => void saveAccessCodeMode("custom_code")}
          >
            Enable shared code
          </Button>
        </div>
      </div>

      {accessMode === "invite_only" || accessMode === "email_gate" ? (
        <div className="bg-card space-y-4 rounded-lg border p-4">
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
