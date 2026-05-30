import "server-only";

import { getToken } from "@/lib/getToken";

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
