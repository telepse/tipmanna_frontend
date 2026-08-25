"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  coOwnerStatusLabel,
  type CoOwnerInviteStatusValue,
} from "@/hooks/use-coowner-invite-status";
import { COOWNER_RESEND_MAX_COUNT } from "@/lib/coowner-config";

type Props = {
  status: CoOwnerInviteStatusValue;
  expiresAt?: string | null;
  resendCount?: number;
  canResend?: boolean;
  resendCooldownSec?: number;
  resending?: boolean;
  onResend?: () => void;
  canRemove?: boolean;
  removing?: boolean;
  onRemove?: () => void;
  className?: string;
};

function daysUntilExpiry(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function formatCooldown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function CoOwnerInviteStatusRow({
  status,
  expiresAt,
  resendCount = 0,
  canResend = false,
  resendCooldownSec = 0,
  resending = false,
  onResend,
  canRemove = false,
  removing = false,
  onRemove,
  className,
}: Props) {
  if (!status) return null;

  const label = coOwnerStatusLabel(status);
  const daysLeft = status === "pending" ? daysUntilExpiry(expiresAt) : null;
  const atResendLimit = resendCount >= COOWNER_RESEND_MAX_COUNT;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs",
        status === "approved"
          ? "text-green-600"
          : status === "pending"
            ? "text-amber-600"
            : status === "expired"
              ? "text-orange-600"
              : status === "revoked"
                ? "text-muted-foreground"
                : "text-red-600",
        className
      )}
    >
      <span>
        Co-owner status: {label}
        {daysLeft != null
          ? ` · expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
          : null}
        {atResendLimit ? " · resend limit reached" : null}
      </span>
      {canResend && onResend ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={resending || removing || resendCooldownSec > 0}
          onClick={() => void onResend()}
        >
          {resending
            ? "Resending…"
            : resendCooldownSec > 0
              ? `Resend in ${formatCooldown(resendCooldownSec)}`
              : "Resend invitation"}
        </Button>
      ) : null}
      {canRemove && onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 px-2 text-xs"
          disabled={resending || removing}
          onClick={() => void onRemove()}
        >
          {removing ? "Removing…" : "Remove"}
        </Button>
      ) : null}
    </div>
  );
}
