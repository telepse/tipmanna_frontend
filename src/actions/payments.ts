"use server";

// -------- Create checkout session -------- //
export async function createCheckoutSessionAction({
  amount,
  eventId,
  userId,
  role,
  characters,
}: {
  amount: number;
  eventId: string;
  userId?: string;
  role?: string;
  characters?: {
    name: string;
    time: string;
    price: number;
  }[];
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/create-checkout-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, eventId, userId, role, characters }),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to create checkout session",
    };
  }

  return { success: true, data };
}

// -------- Get payment session -------- //
export async function getPaymentSessionAction(sessionId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/payment-session?sessionId=${sessionId}`,
    { cache: "no-store" }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to lookup session",
    };
  }

  return {
    success: true,
    amount: data.amount,
    eventId: data.eventId,
    userId: data.userId,
    status: data.status,
  };
}

// -------- Create payment intent for Express Checkout -------- //
export async function createPaymentIntentAction({
  amount,
  eventId,
  userId,
  role,
  characters,
}: {
  amount: number;
  eventId: string;
  userId?: string;
  role?: string;
  characters?: {
    name: string;
    time: string;
    price: number;
    characterId: string;
  }[];
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/create-payment-intent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, eventId, userId, role, characters }),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to create payment intent");
  }

  return data;
}
