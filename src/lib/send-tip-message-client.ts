const backendBase = () => process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

export type TipMessagePayload = {
  eventId: string;
  sender: string;
  text: string;
  tip: number;
  secondaryText?: string;
  selectedTips: string[];
  purchasedSummary: string;
  eventChannelId?: string;
  transactionId?: string;
};

/** Direct client POST to backend — avoids Next.js server action queuing after hard navigation. */
export async function sendTipMessageClient(
  body: TipMessagePayload
): Promise<Response> {
  return fetch(`${backendBase()}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
