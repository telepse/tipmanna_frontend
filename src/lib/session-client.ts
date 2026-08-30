import type { AuthUserPayload } from "@/lib/auth-response";
import { notifyHostSessionCleared } from "@/lib/host-session-probe";

/** Persist auth via HttpOnly cookie route (token) + non-sensitive user cookie. */
export async function persistAuthSession(
  token: string,
  user: AuthUserPayload,
  options?: { expiresDays?: number }
): Promise<boolean> {
  const expiresDays = options?.expiresDays ?? 60;
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

export async function persistHostSession(
  token: string,
  user: AuthUserPayload,
  options?: { expiresDays?: number }
): Promise<boolean> {
  const expiresDays = options?.expiresDays ?? 7;
  try {
    const res = await fetch("/api/auth/host-session", {
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

export async function clearHostSession(): Promise<void> {
  try {
    await fetch("/api/auth/host-session", {
      method: "DELETE",
      credentials: "include",
    });
    notifyHostSessionCleared();
  } catch {
    /* noop */
  }
}

export type CohostSessionUserPayload = {
  id: string;
  eventId: string;
  email: string;
  fullName: string;
};

export async function persistCohostSession(
  token: string,
  user: CohostSessionUserPayload,
  options?: { expiresDays?: number }
): Promise<boolean> {
  const expiresDays = options?.expiresDays ?? 7;
  try {
    const res = await fetch("/api/auth/cohost-session", {
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

export async function clearCohostSession(): Promise<void> {
  try {
    await fetch("/api/auth/cohost-session", {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    /* noop */
  }
}
