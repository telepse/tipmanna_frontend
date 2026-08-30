import { NextResponse } from "next/server";

/** Accepts web-vitals beacons from the client for optional aggregation/logging. */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (body && process.env.NODE_ENV !== "production") {
      console.info("[perf-vitals]", body);
    }
  } catch {
    /* ignore malformed payloads */
  }
  return new NextResponse(null, { status: 204 });
}
