# TipLink payment-return integrity (2026-11-18)

## Contract

After Stripe tip, user returns to the same TipLink and video resumes at **`restoreOffsetSec`** (floored second at PaymentIntent) with snapshotted mute — then tip animation may play.

## Fixes in this change

| Issue | Mitigation |
|-------|------------|
| YouTube **153** in IG WebView | Embed `origin`/`widget_referrer` on all YT playerVars; TipLink forces Open-in-browser + one remount + restore epoch |
| **Failed to load chunk** after Stripe | TipLink payment origins hard-navigate from `/success` (fresh document); Explore/TV stay soft+watchdog |

## Regression stance

- Resume offset math unchanged
- Explore soft redirect unchanged
- TV playback six not edited (TV inherits embed identity via shared `youtubePlayerConfig` only)
- TipLink social audio UX unchanged except banner copy when 153

## Gate before `main`

Re-run TipLink payment return on: iPhone IG, Android IG, Safari, Chrome — tip once and twice; confirm resume second + no stuck 153/chunk without recovery path.
