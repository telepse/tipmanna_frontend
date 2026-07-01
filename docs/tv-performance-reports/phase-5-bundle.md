# Phase 5 — Bundle Optimizations — Performance Report

## Changes

- [`tv-interactive-shell.tsx`](../src/components/tv/tv-interactive-shell.tsx): `dynamic()` for browse panels (Top/Latest/Spotlight/MostTipped/Saved/EventVideoType/Upcoming)
- [`tv-looper.tsx`](../src/components/tv/tv-looper.tsx): `dynamic()` for `CommentDrawer`, `TipsDrawer`

## Metrics

| Metric                           | Before (Phase 4)               | After (Phase 5)         | Delta                          |
| -------------------------------- | ------------------------------ | ----------------------- | ------------------------------ |
| TTFV                             | TBD                            | TBD                     | Est. −100–400 ms parse/hydrate |
| Initial TV route JS              | Run `npm run build` + analyzer | Split into async chunks | **Reduced main-thread parse**  |
| Static JS total (`.next/static`) | 8,088,700 B (pre-rebuild)      | Rebuild to measure      | Run `npm run analyze`          |

## Regressions

First open of browse panel / comment drawer may show brief chunk load delay.

## QA

- [ ] Open each browse panel tab
- [ ] Comment drawer + tips drawer on mobile/desktop looper
