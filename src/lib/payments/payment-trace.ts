/** Correlation id for payment logs (never include secrets). */
export function createPaymentTraceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
