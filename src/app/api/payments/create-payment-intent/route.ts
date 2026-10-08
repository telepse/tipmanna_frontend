import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiBase = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

/** Proxies create-payment-intent with HttpOnly tipper/visitor Bearer when present. */
export async function POST(req: Request) {
  const api = apiBase();
  if (!api) {
    return NextResponse.json(
      { error: { message: "Backend URL not configured" } },
      { status: 500 }
    );
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const tipperToken = cookieStore.get("token")?.value?.trim();
  const visitorToken = cookieStore.get("visitorToken")?.value?.trim();
  const bearer = tipperToken || visitorToken;

  const inviteHeader = req.headers.get("x-event-room-invite-token")?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (inviteHeader) {
    headers["x-event-room-invite-token"] = inviteHeader;
  }

  try {
    const upstream = await fetch(`${api}/payments/create-payment-intent`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Payment service unavailable" } },
      { status: 502 }
    );
  }
}
