# TipLink — Product Behavior Guide

**Audience:** Product, design, and engineering working on TipLink (`/l/[slug]`, preview).

**TipLink is Tipmanna’s flagship product.** Changes that affect playback, tip, Stripe return, or social-entry UX require named bugs, lock text, and tests in the same change.

Session sound preference is **per browser tab** (`sessionStorage` via `src/lib/session-audio.ts`).

---

## LOCKED TIPLINK AUDIO (social)

Do not change without updating this section and `src/lib/__tests__/tiplink-audio-policy.spec.ts` / `tiplink-audio-wiring.spec.ts`.

| Situation | Behavior |
|-----------|----------|
| Autoplay | Always starts **muted** (platform policy). Unmuted autoplay is not promised. |
| iOS / iPadOS WebKit | Programmatic session restore **off**; muted play until user gesture |
| Instagram / TikTok / X in-app browser | Same defer as above + dismissible **Open in browser** banner (copy link / ··· menu) |
| Desktop Chrome / Firefox / non-touch Safari | May restore session sound programmatically when tab wants sound |
| Muted + playing (not docked) | **Tap for sound** pill (`data-testid="tiplink-tap-for-sound"`) |
| First surface tap while muted | **Unmute** (gesture); later taps toggle pause/play |
| Docked mini-player tap | Scroll to video (unchanged) |
| Scrubber mute / play | Unchanged |
| Stripe / tip drawer restore | Resume at floored second from PaymentIntent (`restoreOffsetSec`) + mute snapshot via `usePaymentPlaybackRestore` |
| Stripe return navigation | TipLink `/l/...` uses **hard** navigation after `/success` so WebViews load fresh JS chunks |
| YouTube error 153 after return | Force Open-in-browser banner; one player remount + restore epoch retry; keep pending offset |

Policy: `src/lib/tiplink-audio-policy.ts`, `src/lib/tiplink-payment-return.ts`. Wiring: `src/components/tiplink/tiplink-landing-client.tsx`.

---

## Core flows (must not regress)

- Public TipLink landing + host preview share `TipLinkLandingClient`.
- Tip section / drawers, Create Yours, save, share, comments.
- Payment surface `tiplink` + playback offset snapshot/restore after Stripe.
- Analytics via `@/lib/analytics/tiplink-analytics` only (Wave 3 XOR).

---

## Sibling surfaces (follow-up — not this TipLink audio change)

Same muted-autoplay + weak unmute UX class; lower social-entry severity than TipLink:

| Surface | Notes | Next action |
|---------|-------|-------------|
| Content (`content-client.tsx`) | Session-seeded mute; speaker only | After TipLink device matrix: Tap for sound + first-tap unmute |
| Channel (`channel-client.tsx`) | Same as content | Same |
| Event live (`event-live.tsx`) | VideoPlayer defaults | Review after content/channel |
| Channel code real-time | Defaults | Low priority |
| Featured content card | Inline card | Low priority |
| Program player | Session-seeded | Low priority |
| Explore | Already deferred + Tap for sound on `dev` | Separate Explore matrix/benchmark |
| TV / Home TV preview | Protected TV contract | Do not change for this work |

---

## Related

- `product-behaviors/media-playback-and-audio-policy.md`
- `docs/explore-lock/` (Explore audio lock; TipLink stays isolated)
