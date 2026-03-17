import { cookies } from "next/headers";

export async function getToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");
    return tokenCookie?.value ?? null;
  } catch (error) {
    console.error(`Failed to get token`, error);
    return null;
  }
}
