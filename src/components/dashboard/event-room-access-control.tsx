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
} from "@/actions/events";

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
  initialAccessMode?: "public" | "invite_only";
};

export function EventRoomAccessControl({
  eventId,
  initialAccessMode = "public",
}: Props) {
  const [accessMode, setAccessMode] = useState<"public" | "invite_only">(
    initialAccessMode
  );
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (accessMode !== "invite_only") return;
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
    const mode = next ? "invite_only" : "public";
    setBusy("mode");
    try {
      const res = await patchEventAccessModeAction(eventId, mode);
      if (!res.success) {
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
          onCheckedChange={checked => void toggleAccessMode(checked)}
        />
      </div>

      {accessMode === "invite_only" ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <Label htmlFor="room-invite-email">Invite by email</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                id="room-invite-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="guest@example.com"
                className="max-w-sm"
              />
              <Button
                type="button"
                disabled={busy !== null}
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
            <p className="text-muted-foreground text-sm">Loading invites…</p>
          ) : invites.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No invites sent yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {invites.map(row => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>{row.email}</span>
                  <span className="text-muted-foreground text-xs">
                    {row.used
                      ? `Accepted ${row.acceptedAt ? new Date(row.acceptedAt).toLocaleDateString() : ""}`
                      : `Expires ${new Date(row.expiresAt).toLocaleDateString()}`}
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
