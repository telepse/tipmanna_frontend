# Phase 4 — Network Optimizations — Performance Report

## Changes

- [`TvYoutubePreconnect`](../src/components/tv/tv-youtube-preconnect.tsx) in [`(tv)/layout.tsx`](<../src/app/(tv)/layout.tsx>) — `ReactDOM.preconnect` for nocookie + ytimg + youtube.com
- [`tv-player.tsx`](../src/components/tv/tv-player.tsx): defer `fetchYoutubeAspectInfo` (oEmbed) until first `onPlay`

## Metrics

| Metric                      | Before (Phase 3) | After (Phase 4)              | Delta                 |
| --------------------------- | ---------------- | ---------------------------- | --------------------- |
| TTFV (T5→T6)                | TBD              | TBD                          | Est. −200–500 ms      |
| oEmbed request at `onReady` | Yes              | No (moved to first `onPlay`) | **−1 HTTP at T5**     |
| YouTube preconnect on `/tv` | No               | Yes                          | Faster iframe DNS/TLS |
| Static JS bytes             | Unchanged        | +~0.5 KB                     | Negligible            |

## Regressions

Possible brief default video aspect before oEmbed completes — cosmetic only.

## QA

- [ ] Video plays; aspect correct within ~1s of play
- [ ] DevTools Network: preconnect hints; no oembed before first play
