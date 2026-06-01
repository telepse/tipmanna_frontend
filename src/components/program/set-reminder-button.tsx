"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Bell, Check, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setProgramReminderAction } from "@/actions/program-actions";
import type { RootState } from "@/redux/store";

const OFFSET_LABELS: Record<number, string> = {
  5: "5 minutes before",
  15: "15 minutes before",
  30: "30 minutes before",
  60: "1 hour before",
  1440: "1 day before",
};

export function SetReminderButton({
  programTitle,
  scheduledAt,
  offsetOptions,
  defaultOffset,
  enforcementId,
  globalEnforcementId,
}: {
  programTitle: string;
  scheduledAt: string;
  offsetOptions: number[];
  defaultOffset: number;
  enforcementId?: string;
  globalEnforcementId?: string;
}) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  console.log(isAuthenticated);
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(defaultOffset);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const apiBase = () =>
    (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

  const postId = globalEnforcementId ?? enforcementId ?? "program";

  const setReminder = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        offsetMinutes: offset,
        scheduledAt,
        title: programTitle,
        body: `${programTitle} starts soon.`,
      };
      if (enforcementId) body.enforcementId = enforcementId;
      if (globalEnforcementId) body.globalEnforcementId = globalEnforcementId;

      if (isAuthenticated) {
        const res = await setProgramReminderAction(postId, body);
        if (!res.success) {
          throw new Error(res.message ?? "Failed to set reminder");
        }
      } else {
        if (!email.trim()) {
          throw new Error("Email is required for guest reminders");
        }
        body.email = email.trim();
        const res = await fetch(
          `${apiBase()}/reminder-bucket/posts/${encodeURIComponent(postId)}/set-reminder`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { message?: string }).message ?? `Failed (${res.status})`
          );
        }
      }

      setDone(true);
      toast.success("Reminder set");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set reminder");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
      >
        <Check className="mr-1 size-4" />
        Reminder set
      </Button>
    );
  }

  return (
    <div className="relative rounded-lg border p-3 shadow-lg">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(v => !v)}
      >
        <Bell className="mr-1 size-4" />
        Set reminder
      </Button>
      {open ? (
        <div className="bg-background overflow absolute bottom-full left-0 z-[100030000] mt-2 w-72 rounded-lg border p-3 shadow-lg">
          <p className="mb-2 text-sm font-medium">Remind me</p>
          <div className="space-y-1">
            {offsetOptions.map(min => (
              <label
                key={min}
                className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
              >
                <input
                  type="radio"
                  name="reminder-offset"
                  checked={offset === min}
                  onChange={() => setOffset(min)}
                />
                {OFFSET_LABELS[min] ?? `${min} min before`}
              </label>
            ))}
          </div>
          {!isAuthenticated ? (
            <Input
              type="email"
              placeholder="Email (guest)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-3"
            />
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void setReminder()}
            >
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
