import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBase = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

async function postBackendPresence(authHeader: string): Promise<boolean> {
  const res = await fetch(`${apiBase()}/notifications/presence`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  return res.ok;
}

/**
 * Proxies tipper + active host presence pings (hostToken is HttpOnly).
 * Host cookie/JWT renewal stays on HostDashboardSessionTouch + SessionActivityPinger;
 * presence auth middleware still slides Host.lastActiveAt.
 */
export async function POST() {
  const cookieStore = await cookies();
  const tipperToken = cookieStore.get("token")?.value?.trim();
  const hostToken = cookieStore.get("hostToken")?.value?.trim();

  let tipperOk = false;
  let hostOk = false;

  if (tipperToken) {
    tipperOk = await postBackendPresence(`Bearer ${tipperToken}`);
  }

  if (hostToken) {
    try {
      hostOk = await postBackendPresence(`Bearer ${hostToken}`);
    } catch {
      /* fail open — host presence skipped */
    }
  }

  return NextResponse.json({ ok: tipperOk || hostOk, tipperOk, hostOk });
}
