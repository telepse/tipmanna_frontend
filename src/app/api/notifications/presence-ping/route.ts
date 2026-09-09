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

/** Proxies tipper + active host presence pings (hostToken is HttpOnly). */
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
      const touchRes = await fetch(`${apiBase()}/auth/session/touch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hostToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      if (touchRes.ok) {
        const body = (await touchRes.json()) as {
          token?: string;
          verified?: boolean;
        };
        if (body.verified !== false) {
          const nextToken = body.token?.trim() || hostToken;
          hostOk = await postBackendPresence(`Bearer ${nextToken}`);
        }
      }
    } catch {
      /* fail open — host presence skipped */
    }
  }

  return NextResponse.json({ ok: tipperOk || hostOk, tipperOk, hostOk });
}
