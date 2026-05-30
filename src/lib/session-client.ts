import type { AuthUserPayload } from "@/lib/auth-response";

/** Persist auth via HttpOnly cookie route (token) + non-sensitive user cookie. */
export async function persistAuthSession(
  token: string,
  user: AuthUserPayload,
  options?: { expiresDays?: number }
): Promise<boolean> {
  const expiresDays = options?.expiresDays ?? (user.role === "TIPPER" ? 60 : 7);
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, user, expiresDays }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    /* noop */
  }
}
