"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { resendVideoCoOwnerInviteAction } from "@/actions/events";
import {
  COOWNER_RESEND_MAX_COUNT,
  COOWNER_RESEND_MIN_INTERVAL_MINUTES,
} from "@/lib/coowner-config";

type Props = {
  inviteId: string;
  contentTitle: string;
  youtubeLink: string;
  resentAt?: string | null;
  resendCount?: number | null;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "default";
  className?: string;
  onResent?: () => void;
};

function cooldownSecondsRemaining(resentAt: string | null | undefined): number {
  if (!resentAt) return 0;
  const minMs = COOWNER_RESEND_MIN_INTERVAL_MINUTES * 60_000;
  const elapsed = Date.now() - new Date(resentAt).getTime();
  if (Number.isNaN(elapsed) || elapsed >= minMs) return 0;
  return Math.max(0, Math.ceil((minMs - elapsed) / 1000));
}

function formatCooldown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function CoOwnerPostSubmitResendButton({
  inviteId,
  contentTitle,
  youtubeLink,
  resentAt = null,
  resendCount = 0,
  size = "sm",
  variant = "outline",
  className,
  onResent,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(() =>
    cooldownSecondsRemaining(resentAt)
  );
  const count = resendCount ?? 0;
  const atLimit = count >= COOWNER_RESEND_MAX_COUNT;

  useEffect(() => {
    setCooldownSec(cooldownSecondsRemaining(resentAt));
    if (!resentAt) return;
    const id = window.setInterval(() => {
      setCooldownSec(cooldownSecondsRemaining(resentAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resentAt]);

  const disabled = busy || atLimit || cooldownSec > 0;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={disabled}
      onClick={async e => {
        e.stopPropagation();
        e.preventDefault();
        const link = youtubeLink.trim();
        if (!link) {
          toast.error("Video URL missing — cannot resend co-owner invite");
          return;
        }
        setBusy(true);
        const res = await resendVideoCoOwnerInviteAction(inviteId, {
          contentTitle: contentTitle.trim() || "Video",
          youtubeLink: link,
        });
        setBusy(false);
        if (!res.success) {
          toast.error(res.message ?? "Resend failed");
          return;
        }
        toast.success("Co-owner invitation resent");
        setCooldownSec(COOWNER_RESEND_MIN_INTERVAL_MINUTES * 60);
        onResent?.();
      }}
    >
      {busy
        ? "Resending…"
        : atLimit
          ? "Resend limit reached"
          : cooldownSec > 0
            ? `Resend in ${formatCooldown(cooldownSec)}`
            : "Resend invitation"}
    </Button>
  );
}
