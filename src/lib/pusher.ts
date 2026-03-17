/* eslint-disable @typescript-eslint/no-explicit-any */
import Pusher from "pusher-js";

export const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  forceTLS: true,
  authEndpoint: "/api/pusher/auth",
});

pusherClient.connection.bind("connected", () => {
  console.log("Pusher connected!");
});

pusherClient.connection.bind("error", (err: any) => {
  console.error("Pusher error", err);
});
