import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

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

  try {
    const auth = pusher.authorizeChannel(socketId, channel);
    return new Response(JSON.stringify(auth));
  } catch (err) {
    console.error("Pusher auth error:", err);
    return new Response(JSON.stringify({ error: "Authorization failed" }), {
      status: 500,
    });
  }
}
