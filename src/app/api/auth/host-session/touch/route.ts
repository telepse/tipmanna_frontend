import { NextRequest, NextResponse } from "next/server";

const MAX_AGE_DAYS = 7;

/** Slide the host session cookie window; rotate host JWT when backend requests it. */
export async function POST(req: NextRequest) {
  const hostToken = req.cookies.get("hostToken")?.value?.trim();
  const hostUserRaw = req.cookies.get("hostUser")?.value;
  if (!hostToken || !hostUserRaw) {
    return NextResponse.json({ ok: false, active: false }, { status: 401 });
  }

  let hostUser: Record<string, unknown>;
  try {
    hostUser = JSON.parse(hostUserRaw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, active: false }, { status: 401 });
  }

  let nextHostToken = hostToken;

  try {
    const touchRes = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/session/touch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hostToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (touchRes.ok) {
      const body = (await touchRes.json()) as { token?: string };
      if (body.token?.trim()) nextHostToken = body.token.trim();
    }
  } catch {
    /* keep sliding cookie even if backend touch fails */
  }

  const hostSessionExpiresAt = new Date(
    Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  hostUser.hostSessionExpiresAt = hostSessionExpiresAt;

  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const res = NextResponse.json({
    ok: true,
    active: true,
    hostSessionExpiresAt,
  });
  res.cookies.set("hostToken", nextHostToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  res.cookies.set("hostUser", JSON.stringify(hostUser), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
