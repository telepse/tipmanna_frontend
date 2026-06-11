"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

export type TvScheduleFetchResult = {
  notModified?: boolean;
  body?: unknown;
  etag?: string | null;
  status?: number;
};

export async function fetchTvScheduleAction(opts?: {
  communityId?: string | null;
  ifNoneMatch?: string | null;
  query?: string;
}): Promise<ActionResult<TvScheduleFetchResult>> {
  const base = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(
    /\/$/,
    ""
  );
  if (!base) {
    return actionFail("Backend API URL is not configured");
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

  const headers = await serverAuthHeaders();
  if (opts?.ifNoneMatch?.trim()) {
    headers["If-None-Match"] = opts.ifNoneMatch.trim();
  }

  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 304) {
      return actionOk({ notModified: true, status: 304 });
    }

    if (!res.ok) {
      let detail = `Schedule HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        const msg =
          errBody &&
          typeof errBody === "object" &&
          "error" in errBody &&
          errBody.error &&
          typeof errBody.error === "object" &&
          "message" in errBody.error &&
          typeof errBody.error.message === "string"
            ? errBody.error.message
            : null;
        if (msg) detail = `${detail}: ${msg}`;
      } catch {
        /* ignore non-JSON error bodies */
      }
      return actionFail(detail);
    }

    const body = await res.json();
    return actionOk({
      body,
      etag: res.headers.get("ETag"),
      status: res.status,
    });
  } catch (err) {
    return actionFail(
      err instanceof Error ? err.message : "Failed to load TV schedule"
    );
  }
}
