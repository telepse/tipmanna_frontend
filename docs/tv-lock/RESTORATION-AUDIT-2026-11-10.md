# Doc restoration audit (2026-11-10)

Base ref: `bb4e852` (`origin/dev`). Rule: no claim without evidence.

| Claim | Evidence | Status |
|-------|----------|--------|
| TV playback six are the lock surface | `docs/tv-lock/README.md`; `tv-playback-contract.spec.ts` header | VERIFIED |
| Gesture play stays muted until CUED | Spec: `playWithUserGesture never unmutes…` + `tv-autoplay.ts` | VERIFIED |
| requestPlayback must not gesture-play after load | Spec: `requestPlayback does not call playWithUserGesture…` | VERIFIED |
| Go Live uses syncToLive without resolveGoLiveAction | Spec: `Go Live resets lastSyncedIndex…` | VERIFIED |
| Readiness flush single-shot | Spec: `readiness flush is single-shot…` | VERIFIED |
| Tab snapshot vs GLOBAL | Specs: LOCAL skipped / GLOBAL pending | VERIFIED |
| PPLA Case D (GLOBAL-origin → LOCAL axis) | Spec: `resumeAfterPayment restores PPLA…`; `shouldArmPostPaymentAxis` | VERIFIED |
| Payment pause hold on redirect | Spec: `payment redirect snapshot arms session pause hold` | VERIFIED |
| Session sound per tab | `src/lib/session-audio.ts` sessionStorage keys | VERIFIED |
| Shell network notices outside playback six | `tv-interactive-shell.tsx`, `tv-youtube-reachability.ts` | VERIFIED |
| TV tips isolated from playback six | Tip surfaces vs engine files (see tips stub) | VERIFIED |
| Full historical TV narrative lines 1–319 | Rebuilt from `e4177a1^` product doc | CORRECTED |
| Contract items 7g / 7h / 7a / 8c / 8e named tests | No dedicated `it(...)` titles | CORRECTED — code-backed; listed in contract.md |
| Explore always-muted invariant (pre-fix docs) | Was regression `6a1880c`; fixed in Phase 2 | REMOVED from product truth after fix |

**Phase 2 audio fix evidence:** `src/lib/explore-reel-audio-policy.ts` + specs; feed wiring; `VideoPlayer` mute-sync gate on restore ref.
