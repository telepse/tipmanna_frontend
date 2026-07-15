import {
  createTvScheduleLoadCoalescer,
  isScheduleResponseStale,
} from "./tv-schedule-load-coalesce";

export type TvScheduleFetchResult =
  | { kind: "success"; body: unknown; etag: string | null }
  | { kind: "notModified" }
  | { kind: "failure"; error: Error };

export type TvScheduleLoadOrchestrationOpts = {
  communityId: string | null;
  fetch: (communityId: string | null) => Promise<TvScheduleFetchResult>;
  getCurrentCommunityId: () => string | null;
  applySuccess: (
    body: unknown,
    etag: string | null,
    communityId: string | null
  ) => void;
  scheduleRetry: () => void;
  scheduleReload: (opts: { resetRetry: boolean }) => void;
};

const runCoalesced = createTvScheduleLoadCoalescer();

/**
 * Testable orchestration for TV schedule fetch: keyed coalesce, stale-apply guard,
 * and retry on failure. Mirrors loadSchedule network semantics in tv-provider.
 */
export async function runTvScheduleLoadOrchestration(
  opts: TvScheduleLoadOrchestrationOpts
): Promise<void> {
  const coalesceKey = opts.communityId;
  return runCoalesced(coalesceKey, async () => {
    const fetchCommunityId = opts.communityId;
    try {
      const res = await opts.fetch(fetchCommunityId);
      const current = opts.getCurrentCommunityId();
      if (isScheduleResponseStale(fetchCommunityId, current)) {
        opts.scheduleReload({ resetRetry: true });
        return;
      }

      if (res.kind === "notModified") return;

      if (res.kind === "failure") throw res.error;

      opts.applySuccess(res.body, res.etag, fetchCommunityId);
    } catch {
      if (isScheduleResponseStale(fetchCommunityId, opts.getCurrentCommunityId())) {
        opts.scheduleReload({ resetRetry: true });
        return;
      }
      opts.scheduleRetry();
    }
  });
}
