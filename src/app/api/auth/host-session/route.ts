import { NextRequest, NextResponse } from "next/server";

import {
  clearHostSessionCookies,
  verifyHostSessionWithBackend,
} from "./verify-host-session";

const MAX_AGE_DAYS = 7;

type HostSessionBody = {
  token?: string;
  user?: Record<string, unknown>;
  expiresDays?: number;
};

function setHostSessionCookies(
  res: NextResponse,
  token: string,
  user: Record<string, unknown>,
  days: number
): NextResponse {
  const maxAge = days * 24 * 60 * 60;
  const hostSessionExpiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  res.cookies.set("hostToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  res.cookies.set(
    "hostUser",
    JSON.stringify({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role,
      eventCode: user.eventCode,
      eventSlug: user.eventSlug,
      numOfEvents: user.numOfEvents,
      hostSessionExpiresAt,
    }),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    }
  );

  return res;
}

/**
 * Secondary host session — tipper session stays primary on non-dashboard pages.
 * Login already refreshed backend activity; persist cookies even if touch is skipped.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HostSessionBody;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const user = body.user;
    if (!token || !user || typeof user !== "object") {
      return NextResponse.json(
        { error: "Invalid host session payload" },
        { status: 400 }
      );
    }

    const days = Math.min(
      MAX_AGE_DAYS,
      Math.max(1, Number(body.expiresDays) || 7)
    );
    const hostSessionExpiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    void fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/session/touch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    ).catch(() => undefined);

    const res = NextResponse.json({ ok: true, hostSessionExpiresAt });
    return setHostSessionCookies(res, token, user, days);
  } catch {
    return NextResponse.json(
      { error: "Failed to set host session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  return clearHostSessionCookies(res);
}

/**
 * Check host session.
 * `?verify=true` — backend-validated (canonical for dashboard writes).
 * Default — fast cookie expiry check only (legacy callers).
 */
export async function GET(req: NextRequest) {
  const verify = req.nextUrl.searchParams.get("verify") === "true";
  const hostToken = req.cookies.get("hostToken")?.value?.trim();
  const hostUserRaw = req.cookies.get("hostUser")?.value;

  if (!hostToken || !hostUserRaw) {
    return NextResponse.json({ active: false, code: "HOST_SESSION_REQUIRED" });
  }

  if (verify) {
    return verifyHostSessionWithBackend(hostToken, hostUserRaw);
  }

  try {
    const hostUser = JSON.parse(hostUserRaw) as {
      id?: string;
      hostSessionExpiresAt?: string;
    };
    const expiresAt = hostUser.hostSessionExpiresAt;
    const active = !expiresAt || new Date(expiresAt).getTime() > Date.now();
    return NextResponse.json({
      active,
      hostId: hostUser.id ?? null,
      hostSessionExpiresAt: expiresAt ?? null,
    });
  } catch {
    return NextResponse.json({ active: false, code: "HOST_SESSION_REQUIRED" });
  }
}
