import { cookies } from "next/headers";

export type PrimarySessionVerifyResult =
  | { ok: true; user: { id: string; role: string | null } }
  | { ok: false; code: string };

function parseUserCookie(raw: string | undefined): {
  id: string;
  role: string | null;
} | null {
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as { id?: string; role?: string };
    const id = user.id?.trim();
    if (!id) return null;
    return { id, role: user.role?.trim()?.toUpperCase() ?? null };
  } catch {
    return null;
  }
}

/**
 * Validates HttpOnly primary JWT with backend session/touch (expiry + revocation).
 */
export async function verifyPrimarySessionWithBackend(): Promise<PrimarySessionVerifyResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value?.trim();
  const user = parseUserCookie(cookieStore.get("user")?.value);
  if (!token || !user) {
    return { ok: false, code: "SESSION_ABSENT" };
  }

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return { ok: false, code: "API_NOT_CONFIGURED" };
  }

  try {
    const touchRes = await fetch(`${apiBase}/auth/session/touch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!touchRes.ok) {
      let code = "SESSION_INVALID";
      try {
        const body = (await touchRes.json()) as {
          error?: { code?: string };
          code?: string;
        };
        code = body.error?.code ?? body.code ?? code;
      } catch {
        /* default */
      }
      return { ok: false, code };
    }

    return { ok: true, user: { id: user.id, role: user.role } };
  } catch {
    return { ok: false, code: "SESSION_PROBE_FAILED" };
  }
}
