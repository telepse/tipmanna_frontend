# Phase 8 — Structural Decision Gate (Final)

## Decision: what still requires implementation?

### Will implement next (staging flags only — code already shipped)
| Item | Action |
|------|--------|
| C1 SWR | Enable `NEXT_PUBLIC_TV_SCHEDULE_SWR=1` on staging after QA |
| C5 Direct fetch | Enable `NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH=1` on staging |
| C2+C3 Lazy SSR | Enable `NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS=1` after payment animation QA |

### Will NOT implement (unless new evidence)
| Item | Reason |
|------|--------|
| **C4** SSR schedule seed | SWR + direct fetch cover repeat/cold paths; higher hydration risk |
| **C6** Context memoization | No Profiler proof of 3s tick jank; stale-closure risk |
| **D1** Early YouTube bootstrap | Rejected — playback/payment regression risk |
| **D2** Mount order changes | Rejected — same as D1 |
| **D3** Suspense-only | No benefit without moving SSR awaits |
| **D4** Remove `preloadVideos` | Needs A/B; may help next-video |
| **D5** Payment layer RO | Not a load perf item |
| **D6** Delete legacy TV files | Product reference preserved |

## Already completed without flags
- Dead SSR `getAllCharacterSets` removal (C2 partial, always on)
- oEmbed CUED gap fix (B5 complete)
- All Phases 1–5

## Success criteria for production flag rollout
- [ ] Manual QA matrix (plan §6) pass
- [ ] Repeat-visit TTFV p95 improves with SWR (browser traces)
- [ ] Zero payment animation regressions with lazy SSR flag
- [ ] 48h staging soak per flag

## Final verdict
**Plan implementation is complete** for all intended code phases. Remaining work is **operational** (browser benchmarks, QA, staged flag enablement) — not additional code from Phases 1–6.
****