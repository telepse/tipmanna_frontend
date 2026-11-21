# Explore audio — matrix execution packet

Run before minting `docs/explore-lock/benchmarks/YYYY-MM-DD-audio/`.

## Target environment

| Field | Value |
|-------|--------|
| Branch | `dev` (includes PR #112 merge `f15ebfd`) |
| Build | Record commit SHA: `________` |
| URL | Vercel **dev** or preview: `________` |
| Tester | `________` |
| Date | `________` |

## Procedure

1. Open Explore **Trends** on the URL above in a **fresh tab** (or private window per device).
2. Work through [DEVICE-MATRIX-CHECKLIST.md](./DEVICE-MATRIX-CHECKLIST.md) scenarios **1–11** on each device column.
3. Mark **P** / **F** / **S** in the checklist; add short notes for any **F** or **S**.
4. Complete sign-off only when:
   - All five device rows have a tester + date + overall **PASS**
   - No **F** on rows **1–8** without documented follow-up
   - Row **11** (TV smoke) is **P** or **S** with owner approval
5. Record owner name + date on the checklist “benchmark mint” line.
6. Notify engineering to mint the benchmark folder (docs-only commit); do not edit code unless a **F** requires a named bug fix.

## Scenario hints

| # | What to verify quickly |
|---|------------------------|
| 1 | Unmute via speaker (non-iOS) or expect **Tap for sound** (iOS) after swipe |
| 2 | Speaker off → muted + icon matches |
| 3 | Let reel END → next reel; same audio rules as swipe |
| 4 | Reload tab; sound pref unchanged |
| 5 | Slow network → **Tap to play** then audio gesture |
| 6 | iOS: playing muted + sound wanted → first tap unmutes, does not pause |
| 7 | iOS: **Tap for sound** pill unmutes |
| 8 | Scrubber visible after ready **without** tap (activation retry) |
| 9 | Open tip drawer → mute; close → restore |
| 10 | Stripe tip return → reel audio policy still OK |
| 11 | **Watch TV** from reel → TV loads; TV audio behavior unchanged |

## Hard stop

Any **F** on rows **1–8** → **do not mint**; file a named Explore bug with platform scope.
