import "server-only";

import { cookies } from "next/headers";

/** Read the secondary host session token (HttpOnly cookie). */
export async function getHostToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const hostToken = cookieStore.get("hostToken");
    return hostToken?.value?.trim() ?? null;
  } catch {
    return null;
  }
}
