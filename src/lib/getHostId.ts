import { cookies } from "next/headers";
import { getServerHostSession } from "@/lib/server-host-session";

export async function getHostID(): Promise<string | null> {
  const session = await getServerHostSession();
  return session.hostId;
}
