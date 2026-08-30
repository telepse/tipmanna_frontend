import { NextRequest, NextResponse } from "next/server";

import {
  clearHostSessionCookies,
  verifyHostSessionWithBackend,
} from "../verify-host-session";

/** Slide the host session cookie window; rotate host JWT when backend requests it. */
export async function POST(req: NextRequest) {
  const hostToken = req.cookies.get("hostToken")?.value?.trim();
  const hostUserRaw = req.cookies.get("hostUser")?.value;
  if (!hostToken || !hostUserRaw) {
    const res = NextResponse.json(
      { ok: false, active: false, code: "HOST_SESSION_REQUIRED" },
      { status: 401 }
    );
    return clearHostSessionCookies(res);
  }

  const verified = await verifyHostSessionWithBackend(hostToken, hostUserRaw);
  if (!verified.ok) {
    return verified;
  }

  const body = (await verified.json()) as {
    hostSessionExpiresAt?: string;
  };

  return NextResponse.json(
    {
      ok: true,
      active: true,
      hostSessionExpiresAt: body.hostSessionExpiresAt,
    },
    { headers: verified.headers }
  );
}
