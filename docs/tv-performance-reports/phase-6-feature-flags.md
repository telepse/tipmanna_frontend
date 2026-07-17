# Phase 6 — Feature Flags — Performance Report

## Bottleneck identified (when flags enabled)

1. **Repeat-visit schedule wait** — cold network before looper mounts.
2. **SSR character fetches** — block RSC before HTML (`getCharactersForTipping` + formerly `getAllCharacterSets`).
3. **Server-action hop** for schedule — extra latency per fetch.

## Evidence

- `isReady` gated looper until `loadSchedule` network success.
- `getAllCharacterSets` proven dead in active UI (drawer uses `videoTipCatalog`) — **now always removed from SSR** (gap fix, not flag-gated).
- `fetchTvScheduleAction` adds client→Next→backend hop.

## Implemented (flags default OFF)

| Flag                                     | Item                  | Files                                   |
| ---------------------------------------- | --------------------- | --------------------------------------- |
| `NEXT_PUBLIC_TV_SCHEDULE_SWR=1`          | C1 SWR bootstrap      | `tv-provider.tsx`                       |
| `NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS=1`   | C2+C3 lazy characters | `page.tsx`, `use-tv-lazy-characters.ts` |
| `NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH=1` | C5 direct fetch       | `tv-schedule-client-fetch.ts`           |

## NOT implemented

| Flag                            | Item                 | Reason                                 |
| ------------------------------- | -------------------- | -------------------------------------- |
| `NEXT_PUBLIC_TV_SSR_SCHEDULE=1` | C4 SSR schedule seed | Phase 8 — use SWR + direct fetch first |
| —                               | C6 context split     | Phase 8 — jank not proven              |

## Metrics (flags off = production default)

| Metric                   | Before rollout     | After Phase 6 code (flags off)         | With SWR on (repeat)    |
| ------------------------ | ------------------ | -------------------------------------- | ----------------------- |
| TTFV cold                | TBD                | Same as Phase 5                        | N/A                     |
| TTFV repeat              | TBD                | Same                                   | Est. −800–2500 ms to T4 |
| SSR API calls            | 2 (chars + sets)   | **1** (`getCharactersForTipping` only) | 0 with lazy flag        |
| `ssrGetAllCharacterSets` | true (pre gap-fix) | **false**                              | false                   |
| Schedule fetch path      | Server action      | Server action (or direct if flag)      | Same + cache bootstrap  |

## Gap fix (always on, not flag-gated)

- Removed dead `getAllCharacterSets()` SSR — **−1 blocking API call** on every `/tv` load.

## Expected vs actual

| Item                               | Expected | Actual                              |
| ---------------------------------- | -------- | ----------------------------------- |
| C1/C5/C2+C3 behind flags           | Yes      | `featureFlagsModule: true`          |
| C4 not wired                       | Yes      | `isTvSsrScheduleSeedEnabled` unused |
| No playback changes when flags off | Yes      | Confirmed                           |

## Regressions (when flags ON)

- SWR: stale row + banner
- Lazy SSR: early tip may miss payment animation until client fetch

## QA

- [ ] Staging: each flag independently
- [x] Default deploy: all flags off in `.env` comments
