# Phase 3 — Prefetch Dedupe/Defer — Performance Report

## Bottleneck identified

**Duplicate + synchronous catalog prefetch burst** at `isReady` (up to 24 `getEventCharacterCatalogAction` calls) competing with YouTube iframe init.

## Evidence

- Provider `applySchedulePayloadCore` called `prefetchTvEventCatalogs` synchronously ([`tv-provider.tsx`](../../src/components/tv-provider.tsx)).
- Wrapper duplicated same call on `items` change (removed in Phase 2).
- Plan: single path, deferred until post-TTFV via [`tv-post-ttfv-idle.ts`](../../src/lib/tv-post-ttfv-idle.ts).

## Implementation

- Removed wrapper duplicate entirely.
- Provider: `schedulePostTtfvIdle(() => prefetchTvEventCatalogs(...))`.
- Wrapper: `prefetchTvScheduleTips` also deferred (B8).

## Metrics

| Metric                            | Before (Phase 2)        | After (Phase 3)                             | Δ                     |
| --------------------------------- | ----------------------- | ------------------------------------------- | --------------------- |
| TTFV at T4                        | TBD                     | TBD (est. −200–600 ms)                      | Instrumented          |
| Catalog prefetch at `isReady`     | Up to 24 concurrent     | **0 at T4**                                 | Critical path cleared |
| Duplicate prefetch paths          | 2 (provider + wrapper)  | **1 deferred**                              | Deduped               |
| Wrapper `prefetchTvEventCatalogs` | Removed Phase 2         | No                                          | —                     |
| Provider defer                    | No                      | **`providerCatalogPrefetchDeferred: true`** | Yes                   |
| Server actions at T4              | 1 schedule + N catalogs | **1 schedule**                              | **−N**                |

## Expected vs actual

| Metric                                | Expected                     | Actual                                       |
| ------------------------------------- | ---------------------------- | -------------------------------------------- |
| Network waterfall catalogs after play | Yes                          | Code paths confirm `notifyTvFirstPlay` flush |
| Tip drawer still works                | `loadTvEventCatalog` on open | Unchanged                                    |

## Regressions

Possible ~100–300 ms slower first tip-drawer catalog (acceptable per plan).

## QA

- [x] Audit: `providerCatalogPrefetchDeferred: true`
- [ ] Network: catalog burst after first `onPlay`, not at schedule success
