# Phase 1 — Instrumentation — Performance Report

**Date:** 2026-06-22  
**Change:** T0–T6 `tvLoadMark` in `tvDebugLog.ts`; wired to Suspense fallback (T1), TVProvider mount (T2), schedule load (T3/T4), TvPlayer onReady/onPlay (T5/T6).

## Metrics (baseline — pre Phase 2 optimizations)

| Metric                                       | Before Phase 1        | After Phase 1                                       | Delta               |
| -------------------------------------------- | --------------------- | --------------------------------------------------- | ------------------- |
| TTFV (T6 − T0)                               | Not instrumented      | Instrumented via `?tvDebug=1` → `[TV:load] summary` | Measurement enabled |
| HTTP requests on load (est.)                 | Unmeasured            | Unmeasured at runtime\*                             | —                   |
| Client mount server-action symbols (wrapper) | 12                    | 12                                                  | 0                   |
| Provider catalog prefetch                    | Yes                   | Yes                                                 | 0                   |
| Explore prefetch on `/tv`                    | Yes                   | Yes                                                 | 0                   |
| Dead tipFeed writers                         | 10 `setTipFeed` calls | 10                                                  | 0                   |
| Static JS bytes (`.next/static`)             | 8,088,700             | 8,088,700                                           | 0                   |
| Hydration timing                             | Not instrumented      | T2/T4 marks available                               | Measurement enabled |

\* Runtime TTFV requires browser cold load with `?tvDebug=1`. Export: `sessionStorage['tipmanna-tv-load-metrics-v1']` or console `[TV:load] summary` at T6.

## Static audit snapshot (post-Phase 1, pre-Phase 2)

```json
{
  "wrapperMountActionSymbolCount": 12,
  "deadTipFeedState": true,
  "deadSecondaryFetch": true,
  "wrapperPusherAcquireCount": 4,
  "setTipFeedCallCount": 10,
  "buildStaticJsBytes": 8088700
}
```

## Regressions

None expected — log-only + `performance.mark` (negligible cost).

## QA

- [x] `tvLoadMark` gated; zero string work when debug off (except marks)
- [x] Typecheck paths compile
- [ ] Manual: cold `/tv?tvDebug=1` shows T2 → T3_cache_miss → T4 → T5 → T6 order

## Next phase

Phase 2 — remove dead wrapper fetches (target: −6 to −8 server actions on mount).
