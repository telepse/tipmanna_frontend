"use client";

import { getAuthToken } from "@/lib/getAuthToken";
import { assertNotEmailVerificationRequiredFromResponse } from "@/lib/detect-email-verification-required";
import type { TvScheduleFetchResult } from "@/actions/tv-schedule";

/** Client-side schedule fetch mirroring fetchTvScheduleAction (skips server-action hop). */
export async function fetchTvScheduleClient(opts?: {
  communityId?: string | null;
  ifNoneMatch?: string | null;
  query?: string;
  /** Diagnostic-only correlation id (see tv-startup-trace). Never required. */
  startupTraceId?: string | null;
  /** One id per real schedule HTTP request (Phase A correlation). Never required. */
  scheduleAttemptId?: string | null;
}): Promise<
  | { success: true; data: TvScheduleFetchResult }
  | { success: false; error: string }
> {
  const base = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(
    /\/$/,
    ""
  );
  if (!base) {
    return { success: false, error: "Backend API URL is not configured" };
  }

  const cid = opts?.communityId?.trim();
  const query = opts?.query?.startsWith("?")
    ? opts.query
    : opts?.query
      ? `?${opts.query}`
      : "";
  const path = cid
    ? `/communities/${encodeURIComponent(cid)}/tv/schedule${query}`
    : `/tv/schedule${query}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = (getAuthToken() ?? "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts?.ifNoneMatch?.trim()) {
    headers["If-None-Match"] = opts.ifNoneMatch.trim();
  }
  if (opts?.startupTraceId?.trim()) {
    headers["X-TV-Startup-Trace-Id"] = opts.startupTraceId.trim();
  }
  if (opts?.scheduleAttemptId?.trim()) {
    headers["X-TV-Schedule-Attempt-Id"] = opts.scheduleAttemptId.trim();
  }

  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 304) {
      return { success: true, data: { notModified: true, status: 304 } };
    }

    if (!res.ok) {
      if (await assertNotEmailVerificationRequiredFromResponse(res)) {
        return { success: false, error: "EMAIL_VERIFICATION_REQUIRED" };
      }
      return { success: false, error: `Schedule HTTP ${res.status}` };
    }

    const body = await res.json();
    return {
      success: true,
      data: {
        body,
        etag: res.headers.get("ETag"),
        status: res.status,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load TV schedule",
    };
  }
}
