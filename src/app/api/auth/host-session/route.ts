import { NextRequest, NextResponse } from "next/server";

const MAX_AGE_DAYS = 7;

type HostSessionBody = {
  token?: string;
  user?: Record<string, unknown>;
  expiresDays?: number;
};

/** Secondary host session — tipper session stays primary on non-dashboard pages. */
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
    const maxAge = days * 24 * 60 * 60;
    const hostSessionExpiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const res = NextResponse.json({ ok: true, hostSessionExpiresAt });
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
  } catch {
    return NextResponse.json(
      { error: "Failed to set host session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("hostToken", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("hostUser", "", { path: "/", maxAge: 0 });
  return res;
}

/** Check whether an active host session exists (does not expose the token). */
export async function GET(req: NextRequest) {
  const hostToken = req.cookies.get("hostToken")?.value?.trim();
  const hostUserRaw = req.cookies.get("hostUser")?.value;
  if (!hostToken || !hostUserRaw) {
    return NextResponse.json({ active: false });
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
    return NextResponse.json({ active: false });
  }
}
