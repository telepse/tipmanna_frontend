import { NextRequest, NextResponse } from "next/server";

import { verifyPrimarySessionWithBackend } from "../verify-primary-session";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

/** Server-verified primary session (HttpOnly JWT + backend touch). */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("verify") === "false") {
    return NextResponse.json(
      { authenticated: false, code: "VERIFY_REQUIRED" },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const result = await verifyPrimarySessionWithBackend();
    if (!result.ok) {
      return NextResponse.json(
        { authenticated: false, code: result.code },
        { status: 401, headers: NO_STORE }
      );
    }
    return NextResponse.json(
      {
        authenticated: true,
        user: result.user,
      },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { authenticated: false, code: "SESSION_STATUS_ERROR" },
      { status: 500, headers: NO_STORE }
    );
  }
}
