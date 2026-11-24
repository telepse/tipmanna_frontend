# Explore audio — real-device matrix (release gate)

Run against **dev** or a **Vercel preview** for post-merge `dev` (PR #112). Record pass/fail and notes before minting an Explore benchmark. Procedure: [MATRIX-EXECUTION-PACKET.md](./MATRIX-EXECUTION-PACKET.md).

## Environment under test

| Build (commit) | URL | Matrix run date |
|----------------|-----|-----------------|
| fdbfa9eaf2747addcb8eb06065a5d5cf2f9ec94f | https://tipmanna-fj3ffgvfq-test01.vercel.app/ | 24 Nov 2026 |

## Devices

| Device | OS / browser | Tester | Date | Result |
|--------|----------------|--------|------|--------|
| iPhone | iOS Safari | Taiwo Oladeji | 24-Nov-2026 | PASS |
| iPad | iPadOS Safari | Taiwo Oladeji | 24-Nov-2026 | PASS |
| Android phone | Chrome | Emediong Udoh | 24-Nov-2026 | PASS |
| Desktop | Chrome | Emediong Udoh | 24-Nov-2026 | PASS |
| Desktop | Safari (macOS) | Taiwo Oladeji | 24-Nov-2026 | PASS |

## Scenarios (each device)

Mark **P** pass, **F** fail, **S** skip with reason.

| # | Scenario | iPhone | iPad | Android | Chrome desk | Safari desk |
|---|----------|--------|------|---------|-------------|-------------|
| 1 | Trends reel: sound **on**, swipe next → next reel audible without tap (non-iOS) or **Tap for sound** (iOS) |  P | P | P | P | P |
| 2 | Sound **off** → reels stay muted; speaker icon truthful | P | P | P | P | P |
| 3 | ENDED auto-advance → audio policy same as swipe | P | P | P | P | P |
| 4 | Remount / refresh tab → session sound pref respected | P | P | P | P | P |
| 5 | Tap before PLAYING → **Tap to play** / `play_and_unmute` | P | P | P | P | P |
| 6 | First tap on **playing muted** reel (sound wanted) → unmute, no spurious pause | P | P | P | P | P |
| 7 | **Tap for sound** pill (iOS, sound on) → unmutes | P | P | P | P | P |
| 8 | Scrubber appears after activation (no tap) when player ready | P  | P  | P  | P  | P |
| 9 | Tip drawer → playback snapshot mute; close → restore | P | P | P | P | P |
| 10 | Stripe / payment flow does not break reel audio restore | P | P |  P | P | P |
| 11 | **TV smoke**: Watch TV handoff still works; TV audio unchanged | P | P | P | P | P |

## Sign-off

- [ x ] All required devices tested
- [ x ] No **F** on rows 1–8 without documented follow-up
- [ x ] TV row 11 pass or N/A with owner approval

**Owner confirmation for benchmark mint:** Taiwo Oladeji_______________ **Date:** 24-Nov-2026_______________

After confirmation, mint `docs/explore-lock/benchmarks/YYYY-MM-DD-audio/` per `docs/explore-lock/README.md`.
