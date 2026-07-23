export type YoutubeVerifySlot = 1 | 2;

export type YoutubeVerifyRequest = {
  requestId: number;
  url: string;
  slot: YoutubeVerifySlot;
};

export type YoutubeVerifyApiResult = {
  success: boolean;
  message?: string;
  data?: { status?: string; message?: string } | null;
};

export type YoutubeVerifyOutcome =
  | { kind: "stale" }
  | { kind: "error"; message: string }
  | { kind: "verified" }
  | { kind: "not_found"; message: string };

/** Snapshot url + slot + monotonic id at the moment Verify is clicked. */
export function mintYoutubeVerifyRequest(
  url: string,
  slot: YoutubeVerifySlot,
  requestId: number
): YoutubeVerifyRequest {
  return { requestId, url: url.trim(), slot };
}

/** True when this response still matches the latest in-flight request and form values. */
export function isYoutubeVerifyResponseCurrent(
  request: YoutubeVerifyRequest,
  latestRequestId: number,
  currentUrl: string,
  currentSlot: number
): boolean {
  if (request.requestId !== latestRequestId) return false;
  if (request.url !== currentUrl.trim()) return false;
  if (request.slot !== currentSlot) return false;
  return true;
}

/** Map an API result to a UI outcome, or stale when the request context no longer applies. */
export function resolveYoutubeVerifyOutcome(
  request: YoutubeVerifyRequest,
  latestRequestId: number,
  currentUrl: string,
  currentSlot: number,
  apiResult: YoutubeVerifyApiResult
): YoutubeVerifyOutcome {
  if (
    !isYoutubeVerifyResponseCurrent(
      request,
      latestRequestId,
      currentUrl,
      currentSlot
    )
  ) {
    return { kind: "stale" };
  }

  if (!apiResult.success) {
    return {
      kind: "error",
      message: apiResult.message ?? "Verification failed",
    };
  }

  const status = apiResult.data?.status;
  if (status === "verified") {
    return { kind: "verified" };
  }

  return {
    kind: "not_found",
    message: apiResult.data?.message ?? "Video not found on selected channel",
  };
}
