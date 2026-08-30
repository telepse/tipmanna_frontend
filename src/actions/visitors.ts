"use server";

import { runServerFetch } from "@/lib/action-fetch";

type ClaimVisitorBody = {
  message?: string;
  visitor?: Record<string, unknown>;
  token?: string;
};

export async function claimVisitorAfterPaymentAction(params: {
  transactionId?: string;
  paymentIntentId?: string;
  deviceKey?: string;
}) {
  let ip = "0.0.0.0";
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    const text = await ipRes.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { ip?: string };
        if (typeof parsed.ip === "string") ip = parsed.ip;
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.error(
      "[ServerAction:claimVisitorAfterPaymentAction]",
      "ipify failed",
      e
    );
  }

  const device = params.deviceKey?.trim() || "server-device";
  const body: Record<string, string> = { device, ip };
  if (params.transactionId?.trim()) {
    body.transactionId = params.transactionId.trim();
  }
  if (params.paymentIntentId?.trim()) {
    body.paymentIntentId = params.paymentIntentId.trim();
  }

  const result = await runServerFetch<ClaimVisitorBody>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/visitors/claim-after-payment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "claimVisitorAfterPaymentAction"
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.error || "Unexpected error claiming visitor session",
      data: null,
      error: result.error,
      visitor: undefined,
      token: undefined,
    };
  }

  const payload = result.data;
  const visitor = payload.visitor;
  const token = payload.token;

  return {
    success: true,
    error: null as string | null,
    message: payload.message,
    data: {
      token,
      user: visitor,
    },
    visitor,
    token,
    ...payload,
  };
}

export async function createVisitorTipperAction(deviceKey?: string) {
  let ip = "0.0.0.0";
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    const text = await ipRes.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { ip?: string };
        if (typeof parsed.ip === "string") ip = parsed.ip;
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.error(
      "[ServerAction:createVisitorTipperAction]",
      "ipify failed",
      e
    );
  }

  const device = deviceKey?.trim() || "server-device";
  const timestamp = new Date().toISOString();

  const result = await runServerFetch<ClaimVisitorBody>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/visitors/create`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, device, timestamp }),
      cache: "no-store",
    },
    "createVisitorTipperAction"
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.error || "Unexpected error creating visitor",
      data: null,
      error: result.error,
      visitor: undefined,
      token: undefined,
    };
  }

  const body = result.data;
  const visitor = body.visitor;
  const token = body.token;

  return {
    success: true,
    error: null as string | null,
    message: body.message,
    data: {
      token,
      user: visitor,
    },
    visitor,
    token,
    ...body,
  };
}
