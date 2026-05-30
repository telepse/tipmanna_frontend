import { NextRequest, NextResponse } from "next/server";

const MAX_AGE_DAYS = 60;

type SessionBody = {
  token?: string;
  user?: Record<string, unknown>;
  expiresDays?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SessionBody;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const user = body.user;
    if (!token || !user || typeof user !== "object") {
      return NextResponse.json(
        { error: "Invalid session payload" },
        { status: 400 }
      );
    }

    const days = Math.min(
      MAX_AGE_DAYS,
      Math.max(1, Number(body.expiresDays) || 7)
    );
    const maxAge = days * 24 * 60 * 60;

    const res = NextResponse.json({ ok: true });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    res.cookies.set(
      "user",
      JSON.stringify({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        eventCode: user.eventCode,
        eventSlug: user.eventSlug,
        numOfEvents: user.numOfEvents,
        anonymous: user.anonymous,
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
      { error: "Failed to set session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("user", "", { path: "/", maxAge: 0 });
  return res;
}
