# Phase 4 — Network Optimizations — Performance Report

## Bottleneck identified

1. **Missing YouTube preconnect** on `/tv` (only on explore when `EXPLORE_YT_PRELOAD`).
2. **oEmbed request at player ready/CUED** competing with iframe playback start.

## Evidence

- Root [`layout.tsx`](../../src/app/layout.tsx) preconnect gated by explore flag.
- [`tv-player.tsx`](../../src/components/tv/tv-player.tsx) called `fetchYoutubeAspectInfo` on `onReady` and state CUED (5) — external HTTP to `youtube.com/oembed`.
- Gap fix: removed oEmbed from CUED; `maybeNotifyVideoAspectOnce()` only on first `onPlay`.

## Implementation

- [`TvYoutubePreconnect`](../../src/components/tv/tv-youtube-preconnect.tsx) via `ReactDOM.preconnect` in [`(tv)/layout.tsx`](<../../src/app/(tv)/layout.tsx>).
- oEmbed deferred to T6 only.

## Metrics

| Metric                      | Before (Phase 3)   | After (Phase 4)        | Δ                   |
| --------------------------- | ------------------ | ---------------------- | ------------------- |
| TTFV T5→T6                  | TBD                | TBD (est. −200–500 ms) | Instrumented        |
| oEmbed before first play    | Yes (Ready + CUED) | **No**                 | **−1–2 HTTP at T5** |
| `oembedOnCuedState`         | true (pre-fix)     | **false**              | Fixed               |
| `oembedDeferredToFirstPlay` | partial            | **true**               | Complete            |
| YouTube preconnect on TV    | No                 | **true**               | Added               |
| Server actions              | 2 wrapper          | 2                      | 0                   |
| JS transferred              | Unchanged          | +negligible            | ~0                  |

## Expected vs actual

| Metric                | Expected | Actual (audit)                |
| --------------------- | -------- | ----------------------------- |
| Faster iframe DNS/TLS | Yes      | `youtubePreconnectOnTv: true` |
| No oEmbed at T5       | Yes      | `oembedOnCuedState: false`    |

## Regressions

Brief default aspect possible until T6 — cosmetic.

## QA

- [x] Audit passes oEmbed + preconnect checks
- [ ] DevTools: no oembed before first play
