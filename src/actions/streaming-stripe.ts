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
