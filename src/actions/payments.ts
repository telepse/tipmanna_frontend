"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

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
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/create-checkout-session`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ amount, eventId, userId, role, characters }),
      cache: "no-store",
    },
    "createCheckoutSessionAction"
  );
}

// -------- Get payment session -------- //
export async function getPaymentSessionAction(sessionId: string) {
  const result = await runServerFetch<{
    amount?: number;
    eventId?: string;
    userId?: string;
    status?: string;
  }>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/payment-session?sessionId=${sessionId}`,
    { cache: "no-store" },
    "getPaymentSessionAction"
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.error || "Failed to lookup session",
      data: null,
      error: result.error,
      amount: undefined as number | undefined,
      eventId: undefined as string | undefined,
      userId: undefined as string | undefined,
      status: undefined as string | undefined,
    };
  }

  const data = result.data;
  return {
    success: true,
    error: null as string | null,
    data,
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
  paymentSurface,
  paymentContentId,
  playbackOffsetSec,
  deviceCategory,
  clientSessionId,
  videoFeatureCardId,
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
  paymentSurface?: string;
  paymentContentId?: string;
  playbackOffsetSec?: number;
  deviceCategory?: string;
  clientSessionId?: string;
  videoFeatureCardId?: string;
}) {
  const vf =
    typeof videoFeatureCardId === "string" ? videoFeatureCardId.trim() : "";
  const result = await runServerFetch<Record<string, unknown>>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/create-payment-intent`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({
        amount,
        eventId,
        userId,
        role,
        characters,
        paymentSurface,
        paymentContentId,
        playbackOffsetSec,
        deviceCategory,
        clientSessionId,
        ...(vf ? { videoFeatureCardId: vf } : {}),
      }),
      cache: "no-store",
    },
    "createPaymentIntentAction"
  );

  if (!result.success) {
    console.error("[Stripe:createPaymentIntentAction]", result.error);
  }

  if (!result.success || !result.data) {
    return {
      ...result,
      clientSecret: undefined as string | undefined,
    };
  }

  return { ...result, ...result.data };
}
