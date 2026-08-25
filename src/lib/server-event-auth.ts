import "server-only";

import { getToken } from "@/lib/getToken";
import { getHostToken } from "@/lib/getHostToken";
import { serverAuthHeaders, serverHostAuthHeaders } from "@/lib/server-auth";

/**
 * Auth headers for event-room mutations — prefers host session cookie,
 * falls back to primary token (host / cohost JWT).
 */
export async function serverEventActorAuthHeaders(): Promise<
  Record<string, string>
> {
  const hostHeaders = await serverHostAuthHeaders();
  if (hostHeaders.Authorization) return hostHeaders;
  return serverAuthHeaders(await getToken());
}

export async function hasServerHostSession(): Promise<boolean> {
  return Boolean(await getHostToken());
}
