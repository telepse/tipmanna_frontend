"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

export async function streamingPackCheckoutAction(input: {
  hostId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) {
    return {
      success: false as const,
      error: "Backend API URL is not configured",
    };
  }

  return runServerFetch<{
    sessionId: string;
    url: string | null;
    packOrderId: string;
  }>(
    `${base}/hosts/${input.hostId}/streaming/pack/checkout`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      }),
    },
    "streamingPackCheckoutAction"
  );
}

export async function streamingPackOrderStatusAction(input: {
  hostId: string;
  packOrderId: string;
}) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) {
    return {
      success: false as const,
      error: "Backend API URL is not configured",
    };
  }

  const packOrderId = encodeURIComponent(input.packOrderId.trim());
  const hostId = encodeURIComponent(input.hostId.trim());

  return runServerFetch<{
    packOrderId: string;
    status: "pending" | "paid" | "failed";
    fulfilmentConfirmed: boolean;
    grantUnitsAwarded: string | null;
    paidAt: string | null;
    paymentProcessing: boolean;
  }>(
    `${base}/hosts/${hostId}/streaming/pack/orders/${packOrderId}/status`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
    },
    "streamingPackOrderStatusAction"
  );
}
