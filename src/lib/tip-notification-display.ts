/** Display helpers for host tip notification payloads (host + superadmin). */

export type TipNotificationPayloadView = {
  amountLabel?: string;
  amount?: number;
  character?: string;
  tippedAt?: string;
  paymentSurfaceLabel?: string;
  tipperLabel?: string;
  tipperKind?: string;
  hostName?: string;
  hostUsername?: string;
  eventName?: string;
  videoTitle?: string;
  roomLabel?: string;
  transactionId?: string;
};

export function parseTipNotificationPayload(
  payload: Record<string, unknown> | null | undefined
): TipNotificationPayloadView | null {
  if (!payload) return null;
  if (
    payload.transactionId == null &&
    payload.amount == null &&
    payload.amountLabel == null
  ) {
    return null;
  }
  return {
    amountLabel:
      typeof payload.amountLabel === "string" ? payload.amountLabel : undefined,
    amount: typeof payload.amount === "number" ? payload.amount : undefined,
    character:
      typeof payload.character === "string" ? payload.character : undefined,
    tippedAt:
      typeof payload.tippedAt === "string" ? payload.tippedAt : undefined,
    paymentSurfaceLabel:
      typeof payload.paymentSurfaceLabel === "string"
        ? payload.paymentSurfaceLabel
        : undefined,
    tipperLabel:
      typeof payload.tipperLabel === "string" ? payload.tipperLabel : undefined,
    tipperKind:
      typeof payload.tipperKind === "string" ? payload.tipperKind : undefined,
    hostName:
      typeof payload.hostName === "string" ? payload.hostName : undefined,
    hostUsername:
      typeof payload.hostUsername === "string"
        ? payload.hostUsername
        : undefined,
    eventName:
      typeof payload.eventName === "string" ? payload.eventName : undefined,
    videoTitle:
      typeof payload.videoTitle === "string" ? payload.videoTitle : undefined,
    roomLabel:
      typeof payload.roomLabel === "string" ? payload.roomLabel : undefined,
    transactionId:
      typeof payload.transactionId === "string"
        ? payload.transactionId
        : undefined,
  };
}

export function isHostTipNotificationKind(kind: string): boolean {
  return kind === "host_tip_received" || kind === "host_tip_high_value";
}

export type TipNotificationDetailRow = { label: string; value: string };

export function tipNotificationDetailRows(
  payload: TipNotificationPayloadView,
  options?: { includeHost?: boolean }
): TipNotificationDetailRow[] {
  const rows: TipNotificationDetailRow[] = [];
  if (options?.includeHost && payload.hostName) {
    rows.push({ label: "Host", value: payload.hostName });
  }
  if (payload.amountLabel) {
    rows.push({ label: "Amount", value: payload.amountLabel });
  }
  if (payload.tippedAt) {
    rows.push({
      label: "Date",
      value: new Date(payload.tippedAt).toLocaleString(),
    });
  }
  if (payload.tipperLabel) {
    rows.push({ label: "Tipper", value: payload.tipperLabel });
  }
  if (payload.character) {
    rows.push({ label: "Character", value: payload.character });
  }
  if (payload.paymentSurfaceLabel) {
    rows.push({ label: "Payment surface", value: payload.paymentSurfaceLabel });
  }
  if (payload.roomLabel) {
    rows.push({ label: "Room / video", value: payload.roomLabel });
  } else if (payload.videoTitle) {
    rows.push({ label: "Video", value: payload.videoTitle });
  } else if (payload.eventName) {
    rows.push({ label: "Event", value: payload.eventName });
  }
  return rows;
}
