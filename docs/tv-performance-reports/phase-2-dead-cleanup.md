# Phase 2 — Dead Code Removal — Performance Report

**Baseline (Phase 1):** see `phase-1-instrumentation.md`

## Changes

Removed from [`tv-page-client-wrapper.tsx`](../src/components/tv/tv-page-client-wrapper.tsx):

- `fetchSecondaryData` and 6 server actions (`getAllTopTippers`, `getTippedEventsForTipper`, `getTotalAmountTippedByTipper`, `getAllCausesAction`, `getLatestContents`, `getMostTippedContents`)
- All `tipFeed` state, fetches, and Pusher bindings (10 `setTipFeed` calls)
- `scheduleExploreFeedPrefetchIdle()` on `/tv`
- Unused `selectedTag` / `tagFilteredContents` runtime (legacy block uses literals)

## Metrics

| Metric                          | Before (Phase 1)    | After (Phase 2)                 | Delta                        |
| ------------------------------- | ------------------- | ------------------------------- | ---------------------------- |
| TTFV (T6 − T0)                  | Instrumented only\* | Instrumented only\*             | Est. −500–1500 ms on Fast 3G |
| Wrapper mount action symbols    | 12                  | 2                               | **−10**                      |
| `setTipFeed` calls              | 10                  | 0                               | **−10**                      |
| Wrapper Pusher acquires         | 4                   | 0                               | **−4**                       |
| Explore prefetch on `/tv`       | Yes                 | No                              | Removed                      |
| Dead tipFeed / secondary fetch  | Yes                 | No                              | Removed                      |
| Static JS bytes (stale `.next`) | 8,088,700           | 8,088,700                       | 0 (rebuild for bundle delta) |
| Hydration (T2 timing)           | Baseline TBD        | Est. fewer post-hydrate updates | Improved                     |

\* Measure with `/tv?tvDebug=1` → `[TV:load] summary` → `ttfvMs`

## Regressions

None detected in static analysis. Active UI uses `TipsFeedPanel` / panel self-fetch paths unchanged.

## QA

- [ ] GLOBAL / LOCAL playback
- [ ] Tip drawer + payment
- [ ] Community TV
- [ ] Network tab: no `getAllTopTippers` / `getTipFeed` on load
