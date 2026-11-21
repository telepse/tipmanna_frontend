export type TvTipCheckoutPublicSession = {
  sessionId: string;
  eventId: string;
  eventTitle: string;
  totalMinor: number;
  amountGbp: number;
  currency: string;
  status: string;
  expiresAt: string;
  lines: Array<{
    name: string;
    time: string;
    price: number;
    characterId: string;
  }>;
  tipQuoteId: string | null;
  paymentSurface: string;
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export async function fetchTvTipCheckoutPublicSession(
  token: string
): Promise<TvTipCheckoutPublicSession> {
  const res = await fetch(
    `${apiBase()}/tv-tip-checkout/public/${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
  } & Partial<TvTipCheckoutPublicSession>;
  if (!res.ok) {
    throw new Error(
      typeof body.message === "string" ? body.message : "Checkout unavailable"
    );
  }
  return body as TvTipCheckoutPublicSession;
}

export async function createTvTipCheckoutPaymentIntent(token: string): Promise<{
  client_secret: string;
  transactionId: string;
}> {
  const res = await fetch(
    `${apiBase()}/tv-tip-checkout/public/${encodeURIComponent(token)}/create-payment-intent`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  );
  const body = (await res.json().catch(() => ({}))) as {
    client_secret?: string;
    transactionId?: string;
    message?: string;
  };
  if (!res.ok || !body.client_secret) {
    throw new Error(
      typeof body.message === "string" ? body.message : "Could not start card payment"
    );
  }
  return {
    client_secret: body.client_secret,
    transactionId: body.transactionId || "",
  };
}
