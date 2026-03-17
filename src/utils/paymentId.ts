// helper functions inside EventRoomClient.tsx or /utils/paymentId.ts
export function getLastPaymentId(eventId: string): number {
  return Number(sessionStorage.getItem(`lastPaymentId-${eventId}`)) || 0;
}

export function setLastPaymentId(eventId: string, id: number) {
  sessionStorage.setItem(`lastPaymentId-${eventId}`, String(id));
}
