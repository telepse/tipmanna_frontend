# Phase 7 — Re-measurement Report

## Bottleneck re-assessment

After Phases 1–5 + gap fixes, remaining TTFV contributors are likely:

1. **Cold schedule network RTT** (unavoidable without SWR flag or C4)
2. **YouTube iframe init** (hard floor ~1–2 s)
3. **SSR `getCharactersForTipping`** (until lazy flag on)

## Cumulative static evidence

| Metric                         | Phase 1 baseline | Final   | Improvement |
| ------------------------------ | ---------------- | ------- | ----------- |
| Wrapper mount action symbols   | 12               | **2**   | **−83%**    |
| Dead tipFeed writers           | 10               | **0**   | **−100%**   |
| Pusher subscriptions (wrapper) | 4                | **0**   | **−100%**   |
| Catalog prefetch at T4         | ≤24 sync         | **0**   | Cleared     |
| SSR `getAllCharacterSets`      | Yes              | **No**  | Removed     |
| oEmbed before play             | Yes              | **No**  | Deferred    |
| YouTube preconnect             | No               | **Yes** | Added       |
| Dynamic code splits            | 0                | **11**  | Added       |

## Runtime measurement status

| Metric                 | Status                                     |
| ---------------------- | ------------------------------------------ |
| TTFV p50/p95           | **Requires browser** — use `/tv?tvDebug=1` |
| Hydration T2→T4        | **Instrumented** — compare load marks      |
| JS transferred         | Run `npm run build && npm run analyze`     |
| Request count first 5s | DevTools Network vs baseline ~12+ actions  |

## Go/no-go for Phase 8 structural work

| Gap                   | Enable?                                                                           |
| --------------------- | --------------------------------------------------------------------------------- |
| Repeat-visit schedule | **Yes** — `NEXT_PUBLIC_TV_SCHEDULE_SWR=1` on staging                              |
| Cold TTFB             | **Yes** — `NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS=1` after payment QA                 |
| Cold schedule RTT     | **Maybe** — `NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH=1` first; C4 only if still slow |
| Runtime jank          | **No** — C6 not justified without Profiler data                                   |

## Regressions

None in TV static audit. Manual playback QA pending.
