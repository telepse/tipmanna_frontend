import { cookies } from "next/headers";

export type ServerSessionUser = {
  id: string;
  username: string;
  role: "TIPPER" | "VISITOR" | "HOST";
  displayUsername?: string;
  email?: string;
};

export async function getServerSessionUser(): Promise<ServerSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const raw =
      cookieStore.get("user")?.value ?? cookieStore.get("visitorUser")?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed.id || !parsed.username) return null;
    return {
      id: String(parsed.id),
      username: String(parsed.username),
      role:
        parsed.role === "VISITOR" || parsed.role === "HOST"
          ? parsed.role
          : "TIPPER",
      displayUsername:
        typeof parsed.displayUsername === "string"
          ? parsed.displayUsername
          : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
    };
  } catch (error) {
    console.error("Failed to get session user", error);
    return null;
  }
}

export async function getUsername(): Promise<string | null> {
  const user = await getServerSessionUser();
  return user?.username ?? null;
}
