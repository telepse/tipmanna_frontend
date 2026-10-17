import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Read-only: HttpOnly primary session present (no token in response body). */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value?.trim();
    const userRaw = cookieStore.get("user")?.value;
    if (!token || !userRaw) {
      return NextResponse.json({ authenticated: false });
    }
    let user: Record<string, unknown>;
    try {
      user = JSON.parse(userRaw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ authenticated: false });
    }
    if (!user.id) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
