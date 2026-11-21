# TipLink social audio — device matrix (release gate)

Run against **dev** or Vercel preview for this TipLink audio PR. Sign off before promoting to `main`.

## Environment

| Build (commit) | URL | Date |
|----------------|-----|------|
| dev (e44beec736befae779f79d76186bcaa6029aebda) | https://tipmanna-fj3ffgvfq-test01.vercel.app/l/ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea | 18-Nov-2026 |

## Devices / browsers

| Context | Tester | Result |
|---------|--------|--------|
| iPhone Safari | Taiwo Oladeji | PASS |
| iPhone Instagram in-app | Taiwo Oladeji | PASS |
| Android Chrome | Emediong Udoh | PASS |
| Android Instagram in-app | Emediong Udoh | PASS |
| TikTok or X in-app | Emediong Udoh | PASS |
| Desktop Chrome | Emediong Udoh | PASS |

## Scenarios (mark P / F / S)

| # | Scenario | Pass? |
|---|----------|-------|
| 1 | First load muted autoplay | P |
| 2 | **Tap for sound** / first surface tap unmutes | P |
| 3 | After unmute, surface tap pauses/plays | P |
| 4 | Docked mini-player tap scrolls to video | P |
| 5 | Scrubber mute/play still works | P |
| 6 | Tip drawer open/close does not break audio | P |
| 7 | Stripe return restores playback/mute snapshot |  P |
| 8 | Second TipLink same tab — no lying speaker icon | P |
| 9 | In-app: Open-in-browser banner + Copy link |  P |
| 10 | No hydration console errors | P |

## Sign-off

- [ x] Required devices tested
- [ x] No blocking F on 1–5, 8–10
- [ x] Owner: Taiwo Oladeji_______________ Date: 18-Nov-2026_______________
