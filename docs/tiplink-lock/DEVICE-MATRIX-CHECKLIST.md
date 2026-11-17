# TipLink social audio — device matrix (release gate)

Run against **dev** or Vercel preview for this TipLink audio PR. Sign off before promoting to `main`.

## Environment

| Build (commit) | URL | Date |
|----------------|-----|------|
| | | |

## Devices / browsers

| Context | Tester | Result |
|---------|--------|--------|
| iPhone Safari | | |
| iPhone Instagram in-app | | |
| Android Chrome | | |
| Android Instagram in-app | | |
| TikTok or X in-app | | |
| Desktop Chrome | | |

## Scenarios (mark P / F / S)

| # | Scenario | Pass? |
|---|----------|-------|
| 1 | First load muted autoplay | |
| 2 | **Tap for sound** / first surface tap unmutes | |
| 3 | After unmute, surface tap pauses/plays | |
| 4 | Docked mini-player tap scrolls to video | |
| 5 | Scrubber mute/play still works | |
| 6 | Tip drawer open/close does not break audio | |
| 7 | Stripe return restores playback/mute snapshot | |
| 8 | Second TipLink same tab — no lying speaker icon | |
| 9 | In-app: Open-in-browser banner + Copy link | |
| 10 | No hydration console errors | |

## Sign-off

- [ ] Required devices tested
- [ ] No blocking F on 1–5, 8–10
- [ ] Owner: _______________ Date: _______________
