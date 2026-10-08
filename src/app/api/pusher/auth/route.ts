import { cookies } from "next/headers";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const EVENT_PRESENCE = new RegExp(`^presence-event-(${UUID})$`, "i");
const EVENT_PRIVATE = new RegExp(`^private-event-(${UUID})$`, "i");

function eventIdFromChannel(channel: string): string | null {
  const m = EVENT_PRESENCE.exec(channel) || EVENT_PRIVATE.exec(channel);
  return m ? m[1] : null;
}

function authHeaderFromCookies(
  token: string | undefined,
  hostToken: string | undefined
): string | undefined {
  const host = hostToken?.trim();
  if (host) return `Bearer ${host}`;
  const tipper = token?.trim();
  if (tipper) return `Bearer ${tipper}`;
  return undefined;
}

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const socketId = params.get("socket_id");
  const channel = params.get("channel_name");

  if (!socketId || !channel) {
    return new Response(
      JSON.stringify({ error: "Missing socket_id or channel_name" }),
      { status: 400 }
    );
  }

  const eventId = eventIdFromChannel(channel);
  if (!eventId) {
    return new Response(JSON.stringify({ error: "Channel not allowed" }), {
      status: 403,
    });
  }

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return new Response(
      JSON.stringify({ error: "Backend URL not configured" }),
      {
        status: 500,
      }
    );
  }

  const cookieStore = await cookies();
  const authorization = authHeaderFromCookies(
    cookieStore.get("token")?.value,
    cookieStore.get("hostToken")?.value
  );

  try {
    const upstream = await fetch(`${apiBase}/tracking/pusher/auth/${eventId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: new URLSearchParams({
        socket_id: socketId,
        channel_name: channel,
      }).toString(),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Pusher auth proxy error:", err);
    return new Response(JSON.stringify({ error: "Authorization failed" }), {
      status: 500,
    });
  }
}
