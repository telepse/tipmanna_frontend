# Phase 1 — Instrumentation — Performance Report

## Bottleneck identified
No load bottleneck — **missing observability** prevented measuring TTFV and attributing delays to schedule vs player vs hydration.

## Evidence
- Phase 0 had `tvTrace` but no navigation-relative T0–T6 timeline.
- Staging traces showed `loadSchedule_start` without correlated `onReady`/`onPlay` timestamps.
- Plan required `performance.mark` + persisted metrics before optimizations.

## Implementation
- `tvLoadMark()` in [`tvDebugLog.ts`](../../src/lib/tvDebugLog.ts)
- T1: [`tv-page-suspense-fallback.tsx`](../../src/components/tv/tv-page-suspense-fallback.tsx)
- T2/T4: [`tv-provider.tsx`](../../src/components/tv-provider.tsx)
- T5/T6: [`tv-player.tsx`](../../src/components/tv/tv-player.tsx)
- `npm run tv:perf-audit` baseline script

## Metrics

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| TTFV measurable | No | Yes (`?tvDebug=1`) | Enabled |
| Load milestone persistence | No | `sessionStorage` key | Enabled |
| Server actions on mount | 12 symbols | 12 (unchanged) | 0 |
| HTTP requests | Uninstrumented | Uninstrumented | 0 |
| JS transferred | ~8.1 MB static* | ~8.1 MB static* | 0 |
| Hydration timing | No marks | T2/T4 marks | Enabled |

\*Pre-optimization `.next/static` audit snapshot.

## Expected vs actual
| Expected | Actual |
|----------|--------|
| 0 ms perf gain | 0 ms (instrumentation only) |
| Ordered T0→T6 logs | **Achieved** in code |
| p50/p95 TTFV table | **Pending browser runs** (20 cold loads per device) |

## Regressions
None — debug-gated logging only.

## QA
- [x] `tvLoadMarkInstrumented: true` in audit
- [ ] Manual: `/tv?tvDebug=1` shows T2 → T3 → T4 → T5 → T6
