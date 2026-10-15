import "server-only";

import { cookies } from "next/headers";

/** Read the secondary cohost session token (HttpOnly cookie). */
export async function getCohostToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cohostToken = cookieStore.get("cohostToken");
    return cohostToken?.value?.trim() ?? null;
  } catch {
    return null;
  }
}
