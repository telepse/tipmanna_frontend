import { cookies } from "next/headers";

export async function getHostID(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) return null;

    const parsedUser = JSON.parse(userCookie.value);

    return parsedUser?.id ?? null;
  } catch (error) {
    console.error(`Failed to get token`, error);
    return null;
  }
}
