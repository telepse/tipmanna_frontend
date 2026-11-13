# Explore audio — real-device matrix (release gate)

Run against **dev** or a **Vercel preview** for post-merge `dev` (PR #112). Record pass/fail and notes before minting an Explore benchmark. Procedure: [MATRIX-EXECUTION-PACKET.md](./MATRIX-EXECUTION-PACKET.md).

## Environment under test

| Build (commit) | URL | Matrix run date |
|----------------|-----|-----------------|
| | | |

## Devices

| Device | OS / browser | Tester | Date | Result |
|--------|----------------|--------|------|--------|
| iPhone | iOS Safari | | | |
| iPad | iPadOS Safari | | | |
| Android phone | Chrome | | | |
| Desktop | Chrome | | | |
| Desktop | Safari (macOS) | | | |

## Scenarios (each device)

Mark **P** pass, **F** fail, **S** skip with reason.

| # | Scenario | iPhone | iPad | Android | Chrome desk | Safari desk |
|---|----------|--------|------|---------|-------------|-------------|
| 1 | Trends reel: sound **on**, swipe next → next reel audible without tap (non-iOS) or **Tap for sound** (iOS) | | | | | |
| 2 | Sound **off** → reels stay muted; speaker icon truthful | | | | | |
| 3 | ENDED auto-advance → audio policy same as swipe | | | | | |
| 4 | Remount / refresh tab → session sound pref respected | | | | | |
| 5 | Tap before PLAYING → **Tap to play** / `play_and_unmute` | | | | | |
| 6 | First tap on **playing muted** reel (sound wanted) → unmute, no spurious pause | | | | | |
| 7 | **Tap for sound** pill (iOS, sound on) → unmutes | | | | | |
| 8 | Scrubber appears after activation (no tap) when player ready | | | | | |
| 9 | Tip drawer → playback snapshot mute; close → restore | | | | | |
| 10 | Stripe / payment flow does not break reel audio restore | | | | | |
| 11 | **TV smoke**: Watch TV handoff still works; TV audio unchanged | | | | | |

## Sign-off

- [ ] All required devices tested
- [ ] No **F** on rows 1–8 without documented follow-up
- [ ] TV row 11 pass or N/A with owner approval

**Owner confirmation for benchmark mint:** _______________ **Date:** _______________

After confirmation, mint `docs/explore-lock/benchmarks/YYYY-MM-DD-audio/` per `docs/explore-lock/README.md`.
