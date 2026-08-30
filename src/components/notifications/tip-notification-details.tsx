"use client";

import {
  parseTipNotificationPayload,
  tipNotificationDetailRows,
} from "@/lib/tip-notification-display";

export function TipNotificationDetails({
  payload,
  includeHost = false,
  className = "",
}: {
  payload: Record<string, unknown> | null | undefined;
  includeHost?: boolean;
  className?: string;
}) {
  const parsed = parseTipNotificationPayload(payload);
  if (!parsed) return null;
  const rows = tipNotificationDetailRows(parsed, { includeHost });
  if (!rows.length) return null;
  return (
    <dl className={`mt-3 space-y-2 text-sm ${className}`}>
      {rows.map(row => (
        <div key={row.label}>
          <dt className="text-muted-foreground text-xs">{row.label}</dt>
          <dd className="whitespace-pre-wrap">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
