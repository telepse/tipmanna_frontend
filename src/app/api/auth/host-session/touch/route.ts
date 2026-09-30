import { NextRequest, NextResponse } from "next/server";

import { verifyHostSessionWithBackend } from "../verify-host-session";

/** Slide the host session cookie window; rotate host JWT when backend requests it. */
export async function POST(req: NextRequest) {
  const hostToken = req.cookies.get("hostToken")?.value?.trim();
  const hostUserRaw = req.cookies.get("hostUser")?.value;
  if (!hostToken || !hostUserRaw) {
    // Distinct from expired/invalid: no cookies to clear; tipper-only visitors hit this often.
    return NextResponse.json(
      { ok: false, active: false, code: "HOST_SESSION_ABSENT" },
      { status: 401 }
    );
  }

  const verified = await verifyHostSessionWithBackend(hostToken, hostUserRaw);
  if (verified.status !== 200) {
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
