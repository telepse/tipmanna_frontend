"use client";

type TvScheduleStatusBannersProps = {
  scheduleStale: boolean;
  scheduleError: boolean;
  tvReady: boolean;
  retryScheduleLoad: () => void;
  className?: string;
};

/**
 * Schedule load failure / stale cache messaging (shared with /tv shell and legacy right section).
 */
export function TvScheduleStatusBanners({
  scheduleStale,
  scheduleError,
  tvReady,
  retryScheduleLoad,
  className = "",
}: TvScheduleStatusBannersProps) {
  return (
    <>
      {scheduleStale && tvReady ? (
        <div
          data-testid="tv-schedule-stale-banner"
          className={`rounded-md border border-amber-600 bg-amber-50 p-4 text-sm text-black ${className}`}
        >
          <p className="font-medium">
            Using a cached TV schedule (offline or server error).
          </p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => retryScheduleLoad()}
          >
            Retry fresh load
          </button>
        </div>
      ) : null}
      {scheduleError && !tvReady ? (
        <div
          data-testid="tv-schedule-error-banner"
          className={`border-destructive rounded-md border bg-white p-4 text-sm text-black ${className}`}
        >
          <p className="font-medium">Unable to load the TV schedule.</p>
          <button
            type="button"
            data-testid="tv-schedule-error-retry"
            className="mt-2 underline"
            onClick={() => retryScheduleLoad()}
          >
            Retry
          </button>
        </div>
      ) : null}
    </>
  );
}
