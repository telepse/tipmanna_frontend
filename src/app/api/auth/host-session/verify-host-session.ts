import { NextResponse } from "next/server";

import { authCookieSecureDefault } from "@/lib/auth-cookie-options";

const MAX_AGE_DAYS = 7;

export function clearHostSessionCookies(
  res: NextResponse,
  secure = authCookieSecureDefault()
): NextResponse {
  res.cookies.set("hostToken", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("hostUser", "", {
    httpOnly: false,
    secure,
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
 * Clear cookies only for confirmed invalid host session (HOST_SESSION_REQUIRED).
 * Never clear on ABSENT, EMAIL_VERIFICATION_REQUIRED, or HOST_SESSION_PROBE_FAILED.
 */
export function shouldClearHostCookies(code: string): boolean {
  return code === "HOST_SESSION_REQUIRED";
}

/**
 * Validate host JWT with backend session/touch and refresh cookie window when valid.
 */
export async function verifyHostSessionWithBackend(
  hostToken: string,
  hostUserRaw: string,
  secure = authCookieSecureDefault()
): Promise<NextResponse> {
  let hostUser: HostUserCookie;
  try {
    hostUser = JSON.parse(hostUserRaw) as HostUserCookie;
  } catch {
    // Malformed cookie — do not wipe (may be transient parse issues); client treats as absent.
    return NextResponse.json(
      { active: false, code: "HOST_SESSION_ABSENT" },
      { status: 401 }
    );
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
      // Default JWT/session failures to HOST_SESSION_REQUIRED so idle expiry clears cookies.
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

      const res = NextResponse.json(
        { active: false, code, hostId: hostUser.id ?? null },
        { status: touchRes.status === 401 ? 401 : 403 }
      );
      return shouldClearHostCookies(code)
        ? clearHostSessionCookies(res, secure)
        : res;
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
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  res.cookies.set("hostUser", JSON.stringify(hostUser), {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
