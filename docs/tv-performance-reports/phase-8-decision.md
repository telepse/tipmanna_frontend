# Phase 8 — Structural Decision Gate

## Targets vs current state (flags off)

| Gap                                    | Status                                                | Recommendation                                                           |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Repeat-visit schedule wait             | Addressed when `NEXT_PUBLIC_TV_SCHEDULE_SWR=1`        | **Enable SWR on staging first** — do not enable C4 SSR schedule          |
| Cold TTFB (SSR characters)             | Addressed when `NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS=1` | Enable after payment animation QA                                        |
| Cold schedule RTT                      | Partially addressed by dead-code + defer              | Enable `NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH=1` before SSR schedule seed |
| Runtime jank (3s context tick)         | Not addressed                                         | **Defer C6 context split** — monitor only                                |
| iframe init dominates after Phases 2–5 | Unlikely                                              | **Do not implement early YouTube bootstrap (D1)**                        |

## Not implemented (by design)

- **`NEXT_PUBLIC_TV_SSR_SCHEDULE` (C4):** SWR + direct fetch cover repeat/cold paths with lower risk. Implement C4 only if Phase 7 traces show cold schedule RTT still >40% of TTFV after flags on.
- **Context memoization (C6):** Medium regression risk; no TTFV proof yet.
- **Early YouTube bootstrap (D1):** Rejected — Phase 6 playback architecture must not change.

## Recommended production rollout order

1. Ship Phases 1–5 (flags off) — immediate wins, zero behavioral change
2. Staging: `NEXT_PUBLIC_TV_SCHEDULE_SWR=1` → measure repeat TTFV
3. Staging: `NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH=1`
4. Staging: `NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS=1` after payment QA
5. Skip C4 unless metrics require it

## Go / no-go

| Criterion                      | Result                                              |
| ------------------------------ | --------------------------------------------------- |
| Phase 6 playback preserved     | Yes — no changes to `requestPlayback` / mount gates |
| Server actions on load reduced | Yes — 12 → 2 symbols                                |
| Feature flags default safe     | Yes — all off in `.env`                             |
| Manual QA complete             | **Pending** — run checklist in phase reports        |
