# Phase 3 — Duplicate Prefetch Elimination — Performance Report

## Changes

- Removed wrapper `prefetchTvEventCatalogs` duplicate
- Provider [`applySchedulePayloadCore`](../src/components/tv-provider.tsx): catalog prefetch via `schedulePostTtfvIdle()` (after first `onPlay` or 4s idle)
- Wrapper `prefetchTvScheduleTips`: deferred via `schedulePostTtfvIdle()`
- Added [`tv-post-ttfv-idle.ts`](../src/lib/tv-post-ttfv-idle.ts)

## Metrics

| Metric                             | Before (Phase 2)               | After (Phase 3)  | Delta                                |
| ---------------------------------- | ------------------------------ | ---------------- | ------------------------------------ |
| TTFV                               | TBD                            | TBD              | Est. −200–600 ms at `isReady` window |
| Wrapper `prefetchTvEventCatalogs`  | Removed in Phase 2             | No               | —                                    |
| Catalog prefetch at schedule apply | Synchronous (up to 24 actions) | Post-TTFV idle   | **−24 concurrent actions at T4**     |
| Tips prefetch timing               | On `items` change              | Post-TTFV idle   | Deferred                             |
| Server actions at T4               | ~1 schedule + N catalogs       | ~1 schedule only | Major reduction                      |

## Regressions

None in code paths. Tip drawer still calls `loadTvEventCatalog` on row change.

## QA

- [ ] First tip drawer open loads catalog
- [ ] Network: catalog burst after first `onPlay`, not at schedule success
