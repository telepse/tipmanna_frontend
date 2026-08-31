import "server-only";

import { getToken } from "@/lib/getToken";
import { getHostToken } from "@/lib/getHostToken";

/** Set on host-auth server actions when no hostToken cookie is present. */
export const HOST_AUTH_MISSING_HEADER = "X-Tipmanna-Host-Auth-Missing";

export async function getServerAuthToken(): Promise<string | null> {
  return getToken();
}

export async function serverAuthHeaders(
  clientToken?: string | null
): Promise<Record<string, string>> {
  const token = (
    clientToken?.trim() ||
    (await getServerAuthToken()) ||
    ""
  ).trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Host-scoped calls — never falls back to the tipper token. */
export async function serverHostAuthHeaders(
  clientHostToken?: string | null
): Promise<Record<string, string>> {
  const token = (
    clientHostToken?.trim() ||
    (await getHostToken()) ||
    ""
  ).trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers[HOST_AUTH_MISSING_HEADER] = "1";
  }
  return headers;
}
