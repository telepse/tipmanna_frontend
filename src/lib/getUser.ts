import { cookies } from "next/headers";

export async function getUsername(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    const username = userCookie ? JSON.parse(userCookie.value).username : null;
    return username ?? null;
  } catch (error) {
    console.error(`Failed to get user`, error);
    return null;
  }
}
