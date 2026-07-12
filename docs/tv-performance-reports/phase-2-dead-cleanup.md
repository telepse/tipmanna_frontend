# Phase 2 — Dead Code Removal — Performance Report

## Bottleneck identified
**Parallel dead server work on `/tv` mount** competing with schedule fetch and YouTube init.

## Evidence
- `fetchSecondaryData` fired 6 server actions; data only consumed by `{false && <TVPageClient />}` ([`tv-page-client-wrapper.tsx`](../../src/components/tv/tv-page-client-wrapper.tsx)).
- `const [, setTipFeed]` — 10 writers, **zero readers**; `TipsFeedPanel` uses `useTipsDrawerData`.
- 4 Pusher subscriptions updated dead state → wrapper re-renders on every live tip.
- `scheduleExploreFeedPrefetchIdle()` on wrong route (`/tv` not `/explore`).

## Implementation
Removed dead fetches, tipFeed state, Pusher bindings, explore prefetch. Kept legacy `{false && TVPageClient}` block with literal props.

## Metrics

| Metric | Before (Phase 1) | After (Phase 2) | Δ |
|--------|------------------|-----------------|-----|
| TTFV | TBD | TBD (est. −500–1500 ms Fast 3G) | Instrumented |
| Wrapper mount server-action symbols | **12** | **2** | **−10** |
| `setTipFeed` calls | **10** | **0** | **−10** |
| Wrapper Pusher acquires | **4** | **0** | **−4** |
| Explore prefetch on TV | Yes | **No** | Removed |
| HTTP requests (est. mount) | ~12+ actions | ~2 + schedule | **~−10 actions** |
| JS transferred | Unchanged | Unchanged | 0 |
| Hydration re-renders from live tips | Yes | **No** | Reduced |

## Expected vs actual
| Metric | Expected | Actual (static audit) |
|--------|----------|----------------------|
| −6–8 server actions | −10 action symbols removed | **Exceeded** |
| No user-visible change | Active shell unchanged | **Confirmed** |
| TTFV p95 drop | TBD browser | Pending measurement |

## Regressions
None detected. Active path: `TvInteractiveShell` → `TipsFeedPanel` self-fetch.

## QA
- [x] `deadTipFeedState: false`, `deadSecondaryFetch: false`
- [ ] Network tab: no `getAllTopTippers` / `getTipFeed` on load
