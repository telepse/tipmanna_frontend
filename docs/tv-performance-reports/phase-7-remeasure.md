# Phase 7 — Re-measurement Summary

## Cumulative static audit (final implementation, flags off)

| Metric                       | Phase 1 baseline     | Final                        | Improvement           |
| ---------------------------- | -------------------- | ---------------------------- | --------------------- |
| Wrapper mount action symbols | 12                   | **2**                        | −83%                  |
| Dead `setTipFeed` calls      | 10                   | **0**                        | −100%                 |
| Wrapper Pusher subscriptions | 4                    | **0**                        | −100%                 |
| Explore prefetch on `/tv`    | Yes                  | **No**                       | Removed               |
| Catalog prefetch at T4       | Up to 24 + duplicate | **0 at T4** (idle post-play) | Critical path cleared |
| oEmbed at T5                 | Yes                  | **No**                       | Deferred to T6        |
| YouTube preconnect           | No                   | **Yes**                      | Added                 |

## TTFV measurement procedure

1. Open `/tv?tvDebug=1` (hard refresh / clear site data for cold)
2. Console: `[TV:load] summary` with `ttfvMs`
3. Or: `JSON.parse(sessionStorage.getItem('tipmanna-tv-load-metrics-v1'))`

Run 20 cold loads per device; record p50/p95 for T0→T6.

## Tools

```bash
cd frontend
node scripts/tv-performance-audit.mjs   # static action surface
npm run analyze                          # bundle chunks after Phase 5
```

## Hydration

Compare T2 (`TVProvider_mount`) and T4 (`isReady`) marks before/after using stored metrics.

## Regressions

None identified in typecheck or static audit. Manual playback matrix still required before production flag rollout.

## Bundle note

Rebuild required for accurate JS byte comparison (`npm run build`). Pre-change `.next` snapshot: 8,088,700 B static JS.
