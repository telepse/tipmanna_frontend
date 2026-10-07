"use client";

type TvPlayerNetworkNoticesProps = {
  showIframeUnavailable: boolean;
  showSlowVideo: boolean;
  onRetryIframeProbe: () => void;
  onRetrySlowVideo: () => void;
};

export function TvPlayerNetworkNotices({
  showIframeUnavailable,
  showSlowVideo,
  onRetryIframeProbe,
  onRetrySlowVideo,
}: TvPlayerNetworkNoticesProps) {
  if (!showIframeUnavailable && !showSlowVideo) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
      aria-live="polite"
    >
      {showIframeUnavailable ? (
        <div
          data-testid="tv-youtube-iframe-unavailable"
          className="pointer-events-auto max-w-md rounded-lg border border-white/20 bg-neutral-900 p-4 text-sm text-white shadow-lg"
        >
          <p className="font-medium">
            Video service unavailable on this network.
          </p>
          <p className="mt-2 text-white/85">
            Your network may be restricting YouTube. Try guest Wi‑Fi, mobile
            data, or ask the venue to allow YouTube for Tipmanna TV.
          </p>
          <button
            type="button"
            className="mt-3 underline"
            onClick={onRetryIframeProbe}
          >
            Retry
          </button>
        </div>
      ) : null}
      {showSlowVideo && !showIframeUnavailable ? (
        <div
          data-testid="tv-youtube-slow-video"
          className="pointer-events-auto max-w-md rounded-lg border border-white/20 bg-neutral-900 p-4 text-sm text-white shadow-lg"
        >
          <p className="font-medium">Video is taking longer than expected.</p>
          <p className="mt-2 text-white/85">
            This network may be blocking YouTube video. You can wait, switch
            networks, or reload the page.
          </p>
          <button
            type="button"
            className="mt-3 underline"
            onClick={onRetrySlowVideo}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
