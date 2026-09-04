import { NextResponse } from "next/server";

const MAX_AGE_DAYS = 7;

export function clearHostSessionCookies(res: NextResponse): NextResponse {
  res.cookies.set("hostToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("hostUser", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

type HostUserCookie = {
  id?: string;
  hostSessionExpiresAt?: string;
  [key: string]: unknown;
};

/**
 * Validate host JWT with backend session/touch and refresh cookie window when valid.
 */
export async function verifyHostSessionWithBackend(
  hostToken: string,
  hostUserRaw: string
): Promise<NextResponse> {
  let hostUser: HostUserCookie;
  try {
    hostUser = JSON.parse(hostUserRaw) as HostUserCookie;
  } catch {
    const res = NextResponse.json(
      { active: false, code: "HOST_SESSION_REQUIRED" },
      { status: 401 }
    );
    return clearHostSessionCookies(res);
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

    if (!touchRes.ok) {
      let code = "HOST_SESSION_REQUIRED";
      try {
        const body = (await touchRes.json()) as {
          error?: { code?: string };
          code?: string;
        };
        code = body.error?.code ?? body.code ?? code;
      } catch {
        /* default */
      }

      // Transient upstream / DB failures — keep cookies; client treats as probe failure.
      if (touchRes.status >= 500) {
        return NextResponse.json(
          {
            active: false,
            code: "HOST_SESSION_PROBE_FAILED",
            hostId: hostUser.id ?? null,
            transientFailure: true,
          },
          { status: 503 }
        );
      }

      const sessionInvalid =
        touchRes.status === 401 ||
        (touchRes.status === 403 && code === "HOST_SESSION_REQUIRED");

      const res = NextResponse.json(
        { active: false, code, hostId: hostUser.id ?? null },
        { status: touchRes.status === 401 ? 401 : 403 }
      );
      return sessionInvalid ? clearHostSessionCookies(res) : res;
    }

    const body = (await touchRes.json()) as {
      token?: string;
      verified?: boolean;
    };
    if (body.verified === false) {
      return NextResponse.json(
        {
          active: false,
          code: "EMAIL_VERIFICATION_REQUIRED",
          hostId: hostUser.id ?? null,
        },
        { status: 403 }
      );
    }
    if (body.token?.trim()) nextHostToken = body.token.trim();
  } catch {
    const res = NextResponse.json(
      { active: false, code: "HOST_SESSION_PROBE_FAILED" },
      { status: 503 }
    );
    return res;
  }

  const hostSessionExpiresAt = new Date(
    Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  hostUser.hostSessionExpiresAt = hostSessionExpiresAt;

  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const res = NextResponse.json({
    active: true,
    hostId: hostUser.id ?? null,
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
