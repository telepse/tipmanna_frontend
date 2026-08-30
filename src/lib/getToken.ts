import "server-only";

import { cookies } from "next/headers";

export async function getToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");
    if (tokenCookie?.value?.trim()) return tokenCookie.value.trim();
    const visitorToken = cookieStore.get("visitorToken");
    return visitorToken?.value?.trim() ?? null;
  } catch (error) {
    console.error(`Failed to get token`, error);
    return null;
  }
}
