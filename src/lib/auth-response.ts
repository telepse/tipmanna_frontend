/* eslint-disable @typescript-eslint/no-explicit-any */

export type AuthUserPayload = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "HOST" | "TIPPER" | "VISITOR";
  eventCode?: string | null;
  eventSlug?: string | null;
  numOfEvents?: number;
  individualLegalFirstName?: string | null;
  individualLegalLastName?: string | null;
  organizationName?: string | null;
  anonymous?: boolean;
  hostSubscriptionTier?: "NONE" | "HOST_PREMIUM" | "HOST_COMMUNITY";
};

export type ParsedAuthResponse = {
  message: string;
  token: string;
  user: AuthUserPayload;
  role: "HOST" | "TIPPER";
  tag?: string | null;
  requiresVerification?: boolean;
};

function pickUser(
  raw: any,
  role: "HOST" | "TIPPER" | "VISITOR"
): AuthUserPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id;
  if (!id) return null;
  return {
    id: String(id),
    fullName: String(raw.fullName ?? ""),
    email: String(raw.email ?? ""),
    username: String(raw.username ?? ""),
    role,
    eventCode: raw.eventCode ?? null,
    eventSlug: raw.eventSlug ?? null,
    numOfEvents: raw.numOfEvents ?? 0,
    individualLegalFirstName: raw.individualLegalFirstName ?? null,
    individualLegalLastName: raw.individualLegalLastName ?? null,
    organizationName: raw.organizationName ?? null,
    anonymous: raw.anonymous,
    ...(role === "HOST"
      ? {
          hostSubscriptionTier:
            raw.hostSubscriptionTier === "HOST_PREMIUM" ||
            raw.hostSubscriptionTier === "HOST_COMMUNITY" ||
            raw.hostSubscriptionTier === "NONE"
              ? raw.hostSubscriptionTier
              : undefined,
        }
      : {}),
  };
}

/** Normalise backend auth payloads (`host` / `user` / `tipper` + token). */
export function parseAuthResponse(data: unknown): ParsedAuthResponse | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, any>;
  const token = typeof body.token === "string" ? body.token : null;
  if (!token) return null;

  const message = typeof body.message === "string" ? body.message : "Success";

  const explicitRole =
    body.role === "HOST" || body.role === "TIPPER" ? body.role : null;

  if (body.host) {
    const user = pickUser(body.host, "HOST");
    if (!user) return null;
    return {
      message,
      token,
      user,
      role: "HOST",
      tag: body.tag ?? null,
      requiresVerification: body.requiresVerification === true,
    };
  }

  if (body.tipper) {
    const user = pickUser(body.tipper, "TIPPER");
    if (!user) return null;
    return {
      message,
      token,
      user,
      role: "TIPPER",
      tag: body.tag ?? null,
      requiresVerification: body.requiresVerification !== false,
    };
  }

  if (body.user) {
    const role =
      explicitRole ??
      (body.tag === "EXISTING_HOST" ? "HOST" : ("TIPPER" as const));
    const user = pickUser(body.user, role);
    if (!user) return null;
    return {
      message,
      token,
      user,
      role,
      tag: body.tag ?? null,
      requiresVerification: body.requiresVerification !== false,
    };
  }

  return null;
}

export function isUnverifiedHostMessage(
  message: string | null | undefined
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("verify your email") ||
    m.includes("proceed to verify") ||
    m.includes("email not verified")
  );
}
