# Phase 5 — Bundle Optimizations — Performance Report

## Bottleneck identified
**Large synchronous JS parse/hydrate** from statically imported browse panels and comment/tips drawers in TV route.

## Evidence
- [`tv-interactive-shell.tsx`](../../src/components/tv/tv-interactive-shell.tsx) imported 7 browse panels statically; only one visible at a time.
- [`tv-looper.tsx`](../../src/components/tv/tv-looper.tsx) + [`web-tv-looper.tsx`](../../src/components/tv/web-tv-looper.tsx) statically imported `CommentDrawer` (777+ lines) and `TipsDrawer`.

## Implementation
- 7 `dynamic()` panel imports in shell (TipDrawer was already dynamic).
- 4 `dynamic()` drawer imports (2 per looper file).

## Metrics

| Metric | Before (Phase 4) | After (Phase 5) | Δ |
|--------|------------------|-----------------|-----|
| TTFV / hydration parse | TBD | TBD (est. −100–400 ms) | Instrumented |
| Dynamic panel imports | 0 | **7** | Split |
| Dynamic drawer imports | 0 | **4** | Split |
| Server actions on mount | 2 | 2 | 0 |
| JS initial route chunk | Monolithic imports | Async chunks | **Run `npm run analyze`** |

## Expected vs actual
| Metric | Expected | Actual (audit) |
|--------|----------|----------------|
| Smaller initial TV chunk | Yes | `dynamicPanelImports: 7`, `dynamicDrawerImports: 4` |
| First panel open delay | Brief chunk load | Acceptable tradeoff |

## Regressions
First open of browse panel / drawer may load chunk — low risk.

## QA
- [x] Dynamic imports present in audit
- [ ] Open each browse panel + comment drawer on mobile/desktop
- [ ] `npm run analyze` for chunk size delta
