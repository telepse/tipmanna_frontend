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
 *
 * Wave 2B: tipper and host backend presence posts run concurrently when both
 * cookies are present. Each branch is independently fail-open so one throw
 * cannot abort the other (tipper exceptions map to tipperOk: false).
 */
export async function POST() {
  const cookieStore = await cookies();
  const tipperToken = cookieStore.get("token")?.value?.trim();
  const hostToken = cookieStore.get("hostToken")?.value?.trim();

  const tipperTask = tipperToken
    ? (async (): Promise<boolean> => {
        try {
          return await postBackendPresence(`Bearer ${tipperToken}`);
        } catch {
          /* fail open — tipper presence skipped */
          return false;
        }
      })()
    : Promise.resolve(false);

  const hostTask = hostToken
    ? (async (): Promise<boolean> => {
        try {
          return await postBackendPresence(`Bearer ${hostToken}`);
        } catch {
          /* fail open — host presence skipped */
          return false;
        }
      })()
    : Promise.resolve(false);

  const [tipperOk, hostOk] = await Promise.all([tipperTask, hostTask]);

  return NextResponse.json({ ok: tipperOk || hostOk, tipperOk, hostOk });
}
