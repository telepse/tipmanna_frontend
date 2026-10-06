import { acquireYoutubeIframeApi } from "@/lib/youtube-iframe-api-loader";

export type TvYoutubeReachabilityStatus = "ready" | "failed" | "timed_out";

export type ProbeTvYoutubeIframeApiReachabilityOptions = {
  /** Local probe wait only; does not pass through to the shared loader. */
  probeTimeoutMs?: number;
};

const DEFAULT_PROBE_TIMEOUT_MS = 15_000;

function mapAcquireToReachability(result: {
  state: "idle" | "loading" | "ready" | "failed";
  outcome: string;
}): TvYoutubeReachabilityStatus {
  if (result.state === "ready") return "ready";
  if (result.outcome === "timed_out") return "timed_out";
  return "failed";
}

/**
 * Observe whether the shared YouTube IFrame API loader can reach a ready state.
 * Uses a local timeout race only — never passes absoluteDeadlineMs to the loader.
 */
export async function probeTvYoutubeIframeApiReachability(
  opts?: ProbeTvYoutubeIframeApiReachabilityOptions
): Promise<TvYoutubeReachabilityStatus> {
  const probeTimeoutMs = opts?.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;

  const acquirePromise = acquireYoutubeIframeApi().then(
    mapAcquireToReachability
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<TvYoutubeReachabilityStatus>(resolve => {
    timer = setTimeout(() => resolve("timed_out"), probeTimeoutMs);
  });

  try {
    return await Promise.race([acquirePromise, timeoutPromise]);
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}

/** Retry is the same shared-loader acquire path (no manual script injection). */
export function retryTvYoutubeIframeApiReachability(
  opts?: ProbeTvYoutubeIframeApiReachabilityOptions
): Promise<TvYoutubeReachabilityStatus> {
  return probeTvYoutubeIframeApiReachability(opts);
}

export type WatchSharedYoutubeIframeApiLateReadyOptions = {
  isProbeGenerationActive: () => boolean;
  onReady: () => void;
};

export type WatchSharedYoutubeIframeApiLateReadyHandle = {
  cancel: () => void;
};

/**
 * Observe the shared acquire promise after a bounded probe ended without ready.
 * Reuses the same singleton load — no second script injection.
 */
export function watchSharedYoutubeIframeApiLateReady(
  opts: WatchSharedYoutubeIframeApiLateReadyOptions
): WatchSharedYoutubeIframeApiLateReadyHandle {
  let cancelled = false;
  void acquireYoutubeIframeApi().then(result => {
    if (cancelled || !opts.isProbeGenerationActive()) return;
    if (result.state === "ready") opts.onReady();
  });
  return {
    cancel: () => {
      cancelled = true;
    },
  };
}

export function isIframeProbeGenerationStillActive(
  probeGeneration: number,
  currentGeneration: number,
  mounted: boolean
): boolean {
  return mounted && probeGeneration === currentGeneration;
}
