/* eslint-disable @typescript-eslint/no-explicit-any */

/** Primary session user — always tipper or visitor. */
export type TipperAuthUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  displayUsername?: string;
  role: "TIPPER";
  anonymous?: boolean;
};

export type VisitorAuthUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "VISITOR";
};

/** Host session payload (stored in hostUser cookie, not primary Redux). */
export type HostSessionUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "HOST";
  eventCode?: string | null;
  eventSlug?: string | null;
  numOfEvents?: number;
  individualLegalFirstName?: string | null;
  individualLegalLastName?: string | null;
  organizationName?: string | null;
  lockedCustomerType?: "INDIVIDUAL" | "ORGANIZATION" | null;
  hostSubscriptionTier?: "NONE" | "HOST_PREMIUM" | "HOST_COMMUNITY";
};

/** @deprecated Use TipperAuthUser for primary session. Kept for gradual migration. */
export type AuthUserPayload =
  | TipperAuthUser
  | VisitorAuthUser
  | HostSessionUser;

export type ParsedAuthResponse = {
  message: string;
  token: string | null;
  user: TipperAuthUser;
  role: "TIPPER";
  tag?: string | null;
  hasHostAccount?: boolean;
  requiresVerification?: boolean;
  /** Present when host sign-in returns dual tokens. */
  hostSession?: {
    token: string | null;
    user: HostSessionUser;
  };
};

function pickTipperUser(raw: any): TipperAuthUser | null {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id;
  if (!id) return null;
  return {
    id: String(id),
    fullName: String(raw.fullName ?? ""),
    email: String(raw.email ?? ""),
    username: String(raw.username ?? ""),
    displayUsername:
      typeof raw.displayUsername === "string" ? raw.displayUsername : undefined,
    role: "TIPPER",
    anonymous: raw.anonymous,
  };
}

function pickHostSessionUser(raw: any): HostSessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id;
  if (!id) return null;
  return {
    id: String(id),
    fullName: String(raw.fullName ?? ""),
    email: String(raw.email ?? ""),
    username: String(raw.username ?? ""),
    role: "HOST",
    eventCode: raw.eventCode ?? null,
    eventSlug: raw.eventSlug ?? null,
    numOfEvents: raw.numOfEvents ?? 0,
    individualLegalFirstName: raw.individualLegalFirstName ?? null,
    individualLegalLastName: raw.individualLegalLastName ?? null,
    organizationName: raw.organizationName ?? null,
    lockedCustomerType:
      raw.lockedCustomerType === "INDIVIDUAL" ||
      raw.lockedCustomerType === "ORGANIZATION"
        ? raw.lockedCustomerType
        : null,
    hostSubscriptionTier:
      raw.hostSubscriptionTier === "HOST_PREMIUM" ||
      raw.hostSubscriptionTier === "HOST_COMMUNITY" ||
      raw.hostSubscriptionTier === "NONE"
        ? raw.hostSubscriptionTier
        : undefined,
  };
}

function resolveRequiresVerification(body: Record<string, any>): boolean {
  return body.requiresVerification === true;
}

function extractToken(body: Record<string, any>): string | null {
  if (typeof body.token === "string" && body.token.trim()) {
    return body.token.trim();
  }
  if (typeof body.primary?.token === "string" && body.primary.token.trim()) {
    return body.primary.token.trim();
  }
  return null;
}

/** Pending verification: user known, no JWT until /verify-email succeeds. */
export function isPendingEmailVerification(
  parsed: ParsedAuthResponse
): boolean {
  return parsed.requiresVerification === true && !parsed.token;
}

/** Normalise backend auth payloads — primary is always tipper. */
export function parseAuthResponse(data: unknown): ParsedAuthResponse | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, any>;
  const message = typeof body.message === "string" ? body.message : "Success";
  const requiresVerification = resolveRequiresVerification(body);

  // Dual host login: primary tipper + host session
  if (body.primary?.user) {
    const user = pickTipperUser(body.primary.user);
    if (!user) return null;
    const token =
      typeof body.primary.token === "string" && body.primary.token.trim()
        ? body.primary.token.trim()
        : null;
    if (!token && !requiresVerification) return null;

    const hostRaw = body.host?.user ?? body.hostUser;
    const hostToken =
      typeof body.host?.token === "string" && body.host.token.trim()
        ? body.host.token.trim()
        : typeof body.hostToken === "string" && body.hostToken.trim()
          ? body.hostToken.trim()
          : null;
    const hostUser = hostRaw ? pickHostSessionUser(hostRaw) : null;

    return {
      message,
      token,
      user,
      role: "TIPPER",
      tag: body.tag ?? null,
      requiresVerification,
      hostSession:
        hostUser != null ? { token: hostToken, user: hostUser } : undefined,
    };
  }

  const token = extractToken(body);
  const tipperRaw = body.tipper ?? body.user ?? body.primary?.user;
  const user = pickTipperUser(tipperRaw);
  if (!user) return null;
  if (!token && !requiresVerification) return null;

  const hostRaw = body.host ?? body.hostUser;
  const hostToken =
    typeof body.hostToken === "string" && body.hostToken.trim()
      ? body.hostToken.trim()
      : typeof body.host?.token === "string" && body.host.token.trim()
        ? body.host.token.trim()
        : null;
  const hostUser = hostRaw ? pickHostSessionUser(hostRaw) : null;

  return {
    message,
    token,
    user,
    role: "TIPPER",
    tag: body.tag ?? null,
    hasHostAccount: body.hasHostAccount === true || Boolean(hostUser),
    requiresVerification,
    hostSession:
      hostUser != null ? { token: hostToken, user: hostUser } : undefined,
  };
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

export function isUnclaimedHostClaimMessage(
  message: string | null | undefined
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("pending creator invite") ||
    m.includes("sign up to claim your host account")
  );
}

export function isClaimedHostExistsMessage(
  message: string | null | undefined
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("email already exists as a host");
}
