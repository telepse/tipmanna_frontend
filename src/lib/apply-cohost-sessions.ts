import type { AppDispatch } from "@/redux/store";
import { setCredentials } from "@/features/auth-slice";
import type { TipperAuthUser } from "@/lib/auth-response";
import { persistAuthSession, persistCohostSession } from "@/lib/session-client";

export type CohostSessionUser = {
  id: string;
  eventId: string;
  email: string;
  fullName: string;
};

export type ParsedCohostAuthResponse = {
  message: string;
  token: string;
  user: TipperAuthUser;
  tag: "COHOST";
  cohostSession: {
    token: string;
    user: CohostSessionUser;
  };
};

function pickTipperUser(raw: unknown): TipperAuthUser | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.id;
  if (!id) return null;
  return {
    id: String(id),
    fullName: String(row.fullName ?? ""),
    email: String(row.email ?? ""),
    username: String(row.username ?? ""),
    role: "TIPPER",
    anonymous: row.anonymous as boolean | undefined,
  };
}

function pickCohostUser(raw: unknown): CohostSessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.id;
  const eventId = row.eventId;
  if (!id || !eventId) return null;
  return {
    id: String(id),
    eventId: String(eventId),
    email: String(row.email ?? ""),
    fullName: String(row.fullName ?? ""),
  };
}

/** Normalise cohost invite verify payloads — tipper primary + cohost secondary. */
export function parseCohostAuthResponse(
  data: unknown
): ParsedCohostAuthResponse | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;

  const primaryToken =
    typeof body.primary === "object" &&
    body.primary &&
    typeof (body.primary as { token?: unknown }).token === "string"
      ? (body.primary as { token: string }).token
      : typeof body.token === "string"
        ? body.token
        : null;

  const primaryUserRaw =
    typeof body.primary === "object" && body.primary
      ? (body.primary as { user?: unknown }).user
      : body.user;

  const user = pickTipperUser(primaryUserRaw);
  if (!primaryToken || !user) return null;

  const cohostRaw =
    typeof body.cohost === "object" && body.cohost
      ? body.cohost
      : {
          token: body.cohostToken ?? body.accessToken,
          user: body.cohostUser,
        };

  const cohostToken =
    typeof cohostRaw === "object" &&
    cohostRaw &&
    typeof (cohostRaw as { token?: unknown }).token === "string"
      ? (cohostRaw as { token: string }).token
      : null;

  const cohostUser = pickCohostUser(
    typeof cohostRaw === "object" && cohostRaw
      ? (cohostRaw as { user?: unknown }).user
      : null
  );

  if (!cohostToken || !cohostUser) return null;

  return {
    message:
      typeof body.message === "string" ? body.message : "Cohost access granted",
    token: primaryToken,
    user,
    tag: "COHOST",
    cohostSession: {
      token: cohostToken,
      user: cohostUser,
    },
  };
}

/** Apply dual auth: tipper primary session + cohost secondary cookie. */
export async function applyPrimaryAndCohostSessions(
  parsed: ParsedCohostAuthResponse,
  dispatch: AppDispatch
): Promise<void> {
  dispatch(
    setCredentials({
      user: parsed.user,
      token: parsed.token,
      requiresVerification: false,
      tag: parsed.tag,
    })
  );

  await persistAuthSession(parsed.token, parsed.user, { expiresDays: 60 });
  await persistCohostSession(
    parsed.cohostSession.token,
    parsed.cohostSession.user,
    { expiresDays: 7 }
  );
}
