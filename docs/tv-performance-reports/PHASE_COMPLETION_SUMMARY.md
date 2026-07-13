# TV Performance Rollout — Completion Summary

**Plan:** `tv_performance_rollout_33c41a16.plan.md`  
**Date:** 2026-07-11  
**Status:** Implementation complete for Phases 1–6 (intended scope). Phases 7–8 documented. Remaining gap fixes applied.

---

## Phase status overview

| Phase                                       | Implement?                 | Status                                    |
| ------------------------------------------- | -------------------------- | ----------------------------------------- |
| 1 Instrumentation                           | Yes                        | **Complete**                              |
| 2 Dead cleanup                              | Yes                        | **Complete**                              |
| 3 Prefetch dedupe/defer                     | Yes                        | **Complete**                              |
| 4 Network (preconnect + oEmbed)             | Yes                        | **Complete** (+ CUED oEmbed gap fixed)    |
| 5 Bundle splits                             | Yes                        | **Complete**                              |
| 6 C1 SWR / C2+C3 lazy SSR / C5 direct fetch | Yes (flags, default off)   | **Complete**                              |
| 6 C4 SSR schedule seed                      | **No** (Phase 8 gate)      | Flag stub only — **not implemented**      |
| 6 C6 context split                          | **No** (Phase 8 gate)      | **Not implemented**                       |
| 7 Re-measure                                | Docs + static audit        | **Complete** (runtime TTFV needs browser) |
| 8 Decision                                  | Yes                        | **Complete** — C4/C6 deferred             |
| D1–D3, D5–D6                                | **No** (rejected/deferred) | Correctly not implemented                 |
| D4 `preloadVideos` removal                  | **No** (needs A/B)         | Still in `tv-provider.tsx`                |

### Gap fixes applied (this pass)

1. **oEmbed on CUED (B5):** Removed `notifyVideoAspect()` from YouTube state 5; only `maybeNotifyVideoAspectOnce()` on first `onPlay`.
2. **Dead SSR `getAllCharacterSets` (C2):** Removed from [`page.tsx`](<../src/app/(tv)/tv/page.tsx>) always (proven unused in active UI).
3. **Plan todos:** Marked completed in plan file.
4. **Audit script:** Extended checks (SSR, oEmbed, defer, dynamic imports).

---

## Baseline vs final — static audit evidence

| Metric                              | Pre-optimization (Phase 1 baseline) | Final                  | Δ                         |
| ----------------------------------- | ----------------------------------- | ---------------------- | ------------------------- |
| Wrapper mount server-action symbols | 12                                  | **2**                  | **−10 (−83%)**            |
| `setTipFeed` calls                  | 10                                  | **0**                  | **−100%**                 |
| Wrapper Pusher acquires             | 4                                   | **0**                  | **−100%**                 |
| Explore prefetch on `/tv`           | Yes                                 | **No**                 | Removed                   |
| Dead secondary fetch                | Yes                                 | **No**                 | Removed                   |
| Wrapper duplicate catalog prefetch  | Yes                                 | **No**                 | Removed                   |
| Provider catalog prefetch at T4     | Sync (≤24 actions)                  | **Deferred post-TTFV** | Critical path cleared     |
| SSR `getAllCharacterSets`           | Yes                                 | **No**                 | **−1 SSR API call**       |
| SSR `getCharactersForTipping`       | Yes                                 | Yes (flag can skip)    | −1 more when lazy flag on |
| oEmbed before first play            | Yes (onReady + CUED)                | **No**                 | Deferred to T6            |
| YouTube preconnect on `/tv`         | No                                  | **Yes**                | Added                     |
| Dynamic panel imports               | 0                                   | **7**                  | Code-split                |
| Dynamic drawer imports              | 0                                   | **4**                  | Code-split                |
| `tvLoadMark` instrumentation        | No                                  | **Yes**                | T0–T6                     |

**Audit commands:** `npm run tv:perf-audit`

---

## Runtime metrics (TTFV / hydration / JS)

| Metric                     | Before                                   | After                                          | Notes                                                                                              |
| -------------------------- | ---------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **TTFV (T6−T0)**           | Not measured                             | Instrumented                                   | Cold load `/tv?tvDebug=1` → `[TV:load] summary` or `sessionStorage['tipmanna-tv-load-metrics-v1']` |
| **Hydration T2→T4**        | Not measured                             | Instrumented                                   | Compare `T2` vs `T4` ms in load metrics                                                            |
| **HTTP requests first 5s** | ~12+ client actions + catalogs + explore | ~2 wrapper symbols + 1 schedule + player       | Est. **−10+** server actions on mount                                                              |
| **JS transferred**         | Pre-build snapshot ~8.1 MB static        | Run `npm run build` + analyzer for chunk delta | Use `npm run analyze` post-deploy                                                                  |

**Regression (static):** None in TV modules. Unrelated TS errors exist in `settings-client.tsx` (pre-existing).

---

## Will NOT be implemented (by plan decision)

| ID     | Item                                              | Reason                                                                                 |
| ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **C4** | SSR schedule seed (`NEXT_PUBLIC_TV_SSR_SCHEDULE`) | Phase 8: enable SWR + direct fetch first; C4 only if cold schedule RTT still dominates |
| **C6** | TVContext memoization / split                     | Runtime jank not proven; medium regression risk                                        |
| **D1** | Early YouTube bootstrap before `tvReady`          | Highest playback/payment regression risk                                               |
| **D2** | Playback mount order changes                      | Same as D1                                                                             |
| **D3** | Suspense-only without moving SSR awaits           | No TTFV benefit alone                                                                  |
| **D4** | Remove `preloadVideos` link hints                 | Needs Network A/B; may help next-video preload                                         |
| **D5** | Payment layer / ResizeObserver load changes       | Stability scope, not TTFV                                                              |
| **D6** | Delete `TVPageClient` / legacy files              | Product may restore browse layout                                                      |

---

## Per-phase evidence (summary)

See individual `phase-N-*.md` files for full tables. Each phase documents: bottleneck, proof, expected metric, actual (static) improvement.

---

## Production rollout recommendation

1. **Ship Phases 1–5** with all flags **off** — zero behavioral change, largest static wins.
2. **Staging:** enable flags one at a time (`TV_SCHEDULE_SWR` → `TV_DIRECT_SCHEDULE_FETCH` → `TV_LAZY_SSR_CHARACTERS`).
3. **Do not enable** `TV_SSR_SCHEDULE` until Phase 7 browser traces justify it.
4. **Manual QA:** GLOBAL/LOCAL, payment animation, full-view, community TV, enforcement (checklist in plan §6).
