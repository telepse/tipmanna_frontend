# Explore audio contract (benchmark snapshot)

Frozen against owner matrix on staging FE `fdbfa9e` (24 Nov 2026). Source: working Explore lock + matrix scenarios 1–11.

## LOCKED EXPLORE AUDIO CONTRACT (summary)

1. **Session sound preference** — Trends reels honor the session mute/unmute preference across swipe, ENDED auto-advance, remount, and refresh.
2. **Sound on (non-iOS)** — After unmute, swiping to the next reel keeps audio audible without an extra tap when platform policy allows.
3. **Sound on (iOS)** — After sound is wanted, next reel may show **Tap for sound**; the pill / first eligible tap unmutes without a spurious pause when already playing muted.
4. **Sound off** — Reels stay muted; speaker icon matches muted state.
5. **Pre-PLAYING tap** — Tap before PLAYING uses **Tap to play** / `play_and_unmute` policy as defined in `explore-reel-audio-policy`.
6. **Scrubber** — Appears after activation when the player is ready (no extra tap required for scrubber visibility once ready).
7. **Tip drawer** — Opening the tip drawer snapshots mute; closing restores prior playback audio policy.
8. **Stripe / payment return** — Completing a tip payment flow must not break reel audio restore policy.
9. **TV smoke** — Watch TV handoff still works; TV audio behavior remains under the TV lock (unchanged by this Explore audio mint).

## Spec mapping

| Contract focus | Test files |
|----------------|------------|
| Reel mute / unmute / tap actions | `src/lib/__tests__/explore-reel-audio-policy.spec.ts` |
| Explore golden / lock contract | `src/lib/__tests__/explore-contract.spec.ts` |

## Matrix attestation

All five device/browser columns PASS on scenarios 1–11 per [DEVICE-MATRIX-CHECKLIST.md](../../DEVICE-MATRIX-CHECKLIST.md).
