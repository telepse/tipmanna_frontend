import { NextRequest, NextResponse } from "next/server";

const MAX_AGE_DAYS = 7;

type CohostSessionBody = {
  token?: string;
  user?: Record<string, unknown>;
  expiresDays?: number;
};

/** Secondary cohost session — tipper session stays primary on event room pages. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CohostSessionBody;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const user = body.user;
    if (!token || !user || typeof user !== "object") {
      return NextResponse.json(
        { error: "Invalid cohost session payload" },
        { status: 400 }
      );
    }

    const days = Math.min(
      MAX_AGE_DAYS,
      Math.max(1, Number(body.expiresDays) || 7)
    );
    const maxAge = days * 24 * 60 * 60;
    const cohostSessionExpiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const res = NextResponse.json({ ok: true, cohostSessionExpiresAt });
    res.cookies.set("cohostToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    res.cookies.set(
      "cohostUser",
      JSON.stringify({
        id: user.id,
        eventId: user.eventId,
        email: user.email,
        fullName: user.fullName,
        cohostSessionExpiresAt,
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
      { error: "Failed to set cohost session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("cohostToken", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("cohostUser", "", { path: "/", maxAge: 0 });
  return res;
}

/** Check whether an active cohost session exists (does not expose the token). */
export async function GET(req: NextRequest) {
  const cohostToken = req.cookies.get("cohostToken")?.value?.trim();
  const cohostUserRaw = req.cookies.get("cohostUser")?.value;
  if (!cohostToken || !cohostUserRaw) {
    return NextResponse.json({ active: false });
  }
  try {
    const cohostUser = JSON.parse(cohostUserRaw) as {
      id?: string;
      eventId?: string;
      cohostSessionExpiresAt?: string;
    };
    const expiresAt = cohostUser.cohostSessionExpiresAt;
    const active = !expiresAt || new Date(expiresAt).getTime() > Date.now();
    return NextResponse.json({
      active,
      cohostId: cohostUser.id ?? null,
      eventId: cohostUser.eventId ?? null,
      cohostSessionExpiresAt: expiresAt ?? null,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
