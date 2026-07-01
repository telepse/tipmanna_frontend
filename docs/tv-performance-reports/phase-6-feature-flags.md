# Phase 6 — Feature-Flagged Behavioral Optimizations — Performance Report

## Changes (all **default off**)

| Flag                                     | Implementation                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_TV_SCHEDULE_SWR=1`          | Sync `readTvScheduleCache()` bootstrap in `loadSchedule({ resetRetry })`; stale banner + background refresh                                                  |
| `NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS=1`   | Skip SSR character fetches in [`page.tsx`](<../src/app/(tv)/tv/page.tsx>); [`useTvLazyCharacters`](../src/hooks/use-tv-lazy-characters.ts) client idle fetch |
| `NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH=1` | [`fetchTvScheduleClient`](../src/lib/tv-schedule-client-fetch.ts) bypasses server action hop                                                                 |
| `NEXT_PUBLIC_TV_SSR_SCHEDULE=1`          | **Not implemented** — deferred to Phase 8 (see decision report)                                                                                              |

Central flags: [`tv-feature-flags.ts`](../src/lib/tv-feature-flags.ts)

## Metrics (flags off — production default)

| Metric             | Before        | After (flags off)                  | With SWR on (repeat visit)           |
| ------------------ | ------------- | ---------------------------------- | ------------------------------------ |
| TTFV cold          | TBD           | Same as Phase 5                    | N/A                                  |
| TTFV repeat        | TBD           | Same                               | Est. −800–2500 ms to T4              |
| SSR character RTT  | 2 API calls   | 2 API calls (unchanged until flag) | 0 when lazy flag on                  |
| Schedule fetch hop | Server action | Server action                      | Direct fetch −50–200 ms when flag on |

## Regressions (when flags enabled)

- **SWR:** stale row possible; banner shown
- **Lazy characters:** early tip may miss payment animation until client fetch completes

## QA (per flag)

- [ ] SWR: repeat `/tv` → T3_cache_hit → video before network; banner if stale
- [ ] Lazy SSR: cold TTFB faster; payment animation after characters load
- [ ] Direct fetch: schedule loads; auth works logged-in + anonymous
