import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const apiBase = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

async function postBackendMarkRead(
  notificationId: string,
  authHeader: string
): Promise<Response> {
  return fetch(
    `${apiBase()}/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
}

async function postBackendClick(
  notificationId: string,
  authHeader: string,
  url?: string
): Promise<Response> {
  return fetch(
    `${apiBase()}/notifications/${encodeURIComponent(notificationId)}/click`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: url || undefined }),
      cache: "no-store",
    }
  );
}

async function tryMarkReadWithHostSession(
  notificationId: string,
  hostToken: string
): Promise<boolean> {
  try {
    const touchRes = await fetch(`${apiBase()}/auth/session/touch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!touchRes.ok) return false;

    const body = (await touchRes.json()) as {
      token?: string;
      verified?: boolean;
    };
    if (body.verified === false) return false;

    const nextToken = body.token?.trim() || hostToken;
    const readRes = await postBackendMarkRead(
      notificationId,
      `Bearer ${nextToken}`
    );
    return readRes.ok;
  } catch {
    return false;
  }
}

/** Proxies notification mark-read / click for tipper + active host sessions. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    notificationId?: string;
    action?: "read" | "click";
    url?: string;
  };

  const notificationId = body.notificationId?.trim();
  if (!notificationId) {
    return NextResponse.json(
      { ok: false, error: "notificationId required" },
      { status: 400 }
    );
  }

  const action = body.action === "click" ? "click" : "read";
  const cookieStore = await cookies();
  const tipperToken = cookieStore.get("token")?.value?.trim();
  const hostToken = cookieStore.get("hostToken")?.value?.trim();

  let tipperOk = false;
  let hostOk = false;

  if (tipperToken) {
    const res =
      action === "click"
        ? await postBackendClick(
            notificationId,
            `Bearer ${tipperToken}`,
            body.url
          )
        : await postBackendMarkRead(notificationId, `Bearer ${tipperToken}`);
    tipperOk = res.ok;
  }

  if (!tipperOk && hostToken) {
    if (action === "click") {
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
          const touchBody = (await touchRes.json()) as {
            token?: string;
            verified?: boolean;
          };
          if (touchBody.verified !== false) {
            const nextToken = touchBody.token?.trim() || hostToken;
            const clickRes = await postBackendClick(
              notificationId,
              `Bearer ${nextToken}`,
              body.url
            );
            hostOk = clickRes.ok;
          }
        }
      } catch {
        /* host click skipped */
      }
    } else {
      hostOk = await tryMarkReadWithHostSession(notificationId, hostToken);
    }
  }

  return NextResponse.json({
    ok: tipperOk || hostOk,
    tipperOk,
    hostOk,
    action,
  });
}
