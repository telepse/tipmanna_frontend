import { getAnalyticsSessionId } from "@/lib/analytics-session";
import { isPayerOriginRecoveryEnabled } from "@/lib/payer-origin-recovery-flag";
import {
  tracePaymentAnimation,
  tracePaymentAnimationError,
} from "@/lib/payment-animation-trace";
import type { TipAnimationEvent } from "@/lib/animation-guard";

export type RecoveryApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "gone"
  | "client"
  | "network"
  | "server";

export class RecoveryApiError extends Error {
  readonly kind: RecoveryApiErrorKind;
  readonly status: number;

  constructor(kind: RecoveryApiErrorKind, status: number, message: string) {
    super(message);
    this.name = "RecoveryApiError";
    this.kind = kind;
    this.status = status;
  }
}

function backendBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");
}

function classifyStatus(status: number): RecoveryApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 410) return "gone";
  if (status >= 500) return "server";
  return "client";
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function recoveryFetch(
  path: string,
  init: RequestInit & { sessionToken?: string; maxAttempts?: number }
): Promise<Response> {
  if (!isPayerOriginRecoveryEnabled()) {
    throw new RecoveryApiError("not_found", 404, "Recovery disabled");
  }

  const base = backendBase();
  if (!base) {
    throw new RecoveryApiError("network", 0, "API base URL unset");
  }

  const maxAttempts = init.maxAttempts ?? 1;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.sessionToken) {
    headers.set("Authorization", `Bearer ${init.sessionToken}`);
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
    try {
      const res = await fetch(`${base}/payments${path}`, {
        ...init,
        headers,
        credentials: "include",
      });
      if (
        res.ok ||
        res.status < 500 ||
        attempt === maxAttempts - 1
      ) {
        return res;
      }
      lastErr = new RecoveryApiError("server", res.status, "Server error");
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts - 1) {
        throw new RecoveryApiError(
          "network",
          0,
          err instanceof Error ? err.message : "Network error"
        );
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new RecoveryApiError("network", 0, "Request failed");
}

export async function exchangeRecoveryStateRequest(params: {
  recoveryState: string;
  transactionId: string;
  stripePaymentIntentId: string;
  eventId: string;
  tipperId?: string;
  visitorId?: string;
  clientSessionId?: string;
}): Promise<{ sessionToken: string; expiresAt: string }> {
  tracePaymentAnimation({
    stage: "payer_recovery_exchange_started",
    transactionId: params.transactionId,
    eventId: params.eventId,
    maskedPaymentIntentId: params.stripePaymentIntentId.slice(-6),
  });

  const res = await recoveryFetch("/animation-recovery/exchange", {
    method: "POST",
    body: JSON.stringify({
      recoveryState: params.recoveryState,
      transactionId: params.transactionId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      eventId: params.eventId,
      clientSessionId: params.clientSessionId ?? getAnalyticsSessionId(),
      ...(params.tipperId ? { tipperId: params.tipperId } : {}),
      ...(params.visitorId ? { visitorId: params.visitorId } : {}),
    }),
    maxAttempts: 3,
  });

  if (!res.ok) {
    const kind = classifyStatus(res.status);
    tracePaymentAnimation({
      stage: "payer_recovery_exchange_failed",
      transactionId: params.transactionId,
      eventId: params.eventId,
      result: kind,
      reason: String(res.status),
    });
    throw new RecoveryApiError(kind, res.status, `Exchange failed (${res.status})`);
  }

  const body = (await parseJsonSafe(res)) as {
    ok?: boolean;
    sessionToken?: string;
    expiresAt?: string;
  };
  if (!body?.sessionToken || !body?.expiresAt) {
    throw new RecoveryApiError("client", res.status, "Invalid exchange response");
  }

  tracePaymentAnimation({
    stage: "payer_recovery_exchange_completed",
    transactionId: params.transactionId,
    eventId: params.eventId,
    result: "ok",
  });

  return { sessionToken: body.sessionToken, expiresAt: body.expiresAt };
}

export type ClaimRecoveryResult = {
  canonicalPayload: TipAnimationEvent & {
    resolvedTips?: Array<{
      name: string;
      iconUrl: string;
      styleName: string | null;
      characterId: string | null;
      occurrenceIndex?: number;
      occurrenceId?: string;
    }>;
  };
  remainingOccurrenceIds: string[];
  claimId: string;
  leaseExpiresAt: string;
};

export async function claimRecoveryOccurrencesRequest(
  sessionToken: string
): Promise<ClaimRecoveryResult> {
  tracePaymentAnimation({ stage: "payer_recovery_claim_started" });

  const res = await recoveryFetch("/animation-recovery/claim", {
    method: "POST",
    body: JSON.stringify({}),
    sessionToken,
    maxAttempts: 2,
  });

  if (!res.ok) {
    const kind = classifyStatus(res.status);
    throw new RecoveryApiError(kind, res.status, `Claim failed (${res.status})`);
  }

  const body = (await parseJsonSafe(res)) as ClaimRecoveryResult;
  tracePaymentAnimation({
    stage: "payer_recovery_claim_completed",
    bundleId: body.canonicalPayload?.id,
    claimId: body.claimId,
    taskCount: body.remainingOccurrenceIds?.length,
  });
  return body;
}

export async function renewRecoveryClaimRequest(
  sessionToken: string,
  claimId: string
): Promise<{ claimId: string; leaseExpiresAt: string }> {
  const res = await recoveryFetch("/animation-recovery/renew", {
    method: "POST",
    body: JSON.stringify({ claimId }),
    sessionToken,
    maxAttempts: 2,
  });

  if (!res.ok) {
    const kind = classifyStatus(res.status);
    throw new RecoveryApiError(kind, res.status, `Renew failed (${res.status})`);
  }

  const body = (await parseJsonSafe(res)) as {
    claimId: string;
    leaseExpiresAt: string;
  };
  tracePaymentAnimation({
    stage: "payer_recovery_lease_renewed",
    claimId: body.claimId,
  });
  return body;
}

export type OccurrenceProgressRow = {
  occurrenceId: string;
  playbackResult: "completed" | "failed";
  cycle1Outcome?: string;
  cycle2Outcome?: string;
};

export async function reportRecoveryProgressRequest(
  sessionToken: string,
  params: {
    transactionId: string;
    bundleId: string;
    claimId: string;
    surface: string;
    occurrences: OccurrenceProgressRow[];
  }
): Promise<{ deliveryComplete: boolean }> {
  const res = await recoveryFetch("/animation-recovery/progress", {
    method: "POST",
    body: JSON.stringify(params),
    sessionToken,
    maxAttempts: 2,
  });

  if (!res.ok) {
    const kind = classifyStatus(res.status);
    throw new RecoveryApiError(kind, res.status, `Progress failed (${res.status})`);
  }

  const body = (await parseJsonSafe(res)) as { deliveryComplete?: boolean };
  return { deliveryComplete: Boolean(body?.deliveryComplete) };
}

export function traceRecoveryApiError(
  stage: import("@/lib/payment-animation-trace").PaymentAnimationTraceStage,
  err: unknown,
  partial?: Record<string, unknown>
): void {
  if (err instanceof RecoveryApiError) {
    tracePaymentAnimation({
      stage,
      result: err.kind,
      reason: String(err.status),
      ...partial,
    });
    return;
  }
  tracePaymentAnimationError(stage, err, partial);
}

export function isDefinitiveExchangeRejection(err: unknown): boolean {
  if (!(err instanceof RecoveryApiError)) return false;
  return (
    err.kind === "forbidden" ||
    err.kind === "conflict" ||
    err.kind === "client" ||
    (err.kind === "not_found" && err.status === 404)
  );
}

export function isTransientExchangeFailure(err: unknown): boolean {
  if (!(err instanceof RecoveryApiError)) return true;
  return err.kind === "network" || err.kind === "server";
}
