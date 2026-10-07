# Restricted networks and YouTube — product behavior

**Audience:** Product, support, and engineering.  
**Ops detail:** `docs/ops/venue-wifi-youtube-allowlist.md`

Tipmanna TV and Explore play video through the **YouTube IFrame API** and **YouTube’s CDN**. The Tipmanna web app can load from Cloudflare or venue Wi‑Fi while **YouTube is blocked or degraded** on the same network. This document describes what users see and what they can do.

---

## Network layers (support mental model)

| Layer                 | User-visible symptom if it fails                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Tipmanna site + API   | Page errors, schedule won’t load, sign-in fails                                                                    |
| YouTube IFrame API    | TV: **“Video service unavailable on this network”**                                                                |
| YouTube embed + media | Blank or stuck player; TV may show **“Video is taking longer than expected…”**; Explore may show **“Tap to play”** |

Allowlisting only Tipmanna does **not** fix YouTube blocks. Tipmanna does **not** re-stream YouTube video through its own origin.

---

## TV — Stage 1 failure UX (shell observation only)

Implemented in `tv-interactive-shell.tsx` (does not drive playback; locked engine unchanged).

### Case A — IFrame API unreachable

**When:** Bounded probe of the shared YouTube IFrame API fails or times out locally, while TV schedule is ready (`tvReady`).

**Copy (approximate):**

- “Video service unavailable on this network.”
- “Your network may be restricting YouTube…”
- **Retry** re-runs the reachability probe only (no Go Live, no forced play).

If the shared loader later becomes ready, the notice clears automatically without requiring Retry.

### Case B — API OK but video never reaches PLAYING

**When:** After ~**20 seconds** of eligible observation, the active row never reports PLAYING (not shown during normal BUFFERING/PAUSED, payment, or notice rows).

**Copy (approximate):**

- “Video is taking longer than expected.”
- “This network may be blocking YouTube video…”
- **Retry** performs a **full page reload** of the current `/tv` URL (soft recovery without mutating the locked player engine).

### Schedule load failures (separate from YouTube)

If the schedule cannot load, banners explain the error and offer **Retry** via existing `retryScheduleLoad`. This is independent of YouTube reachability.

---

## Explore — programmatic audio (Stage 2)

**Invariant:** A newly activated Explore reel **starts muted**. Session “sound on” preference does **not** programmatically unmute on:

- Initial load
- Swipe / scroll to the next reel
- ENDED → next
- Player remount / retry

**Explicit user gesture** (mute/unmute control, tap-to-play path) may unmute and play according to session rules.

Other surfaces using `VideoPlayer` keep default programmatic session restore unless they opt out.

---

## Explore — never-PLAYING recovery (Stage 3)

**When:** Active reel has not reported actual **PLAYING** (`onPlayStateChange(true)`) for about **8 seconds**, and the reel is not buffering, not intentionally paused after play, tip drawer is closed, and Explore feed surface is active.

**UX:** Lightweight **“Tap to play”** on the active reel.

**First interaction before PLAYING:** User gesture **plays** (and may unmute per Stage 2 rules); it must **not** be treated as pause merely because UI pause state was false.

**Not in scope:** Automatic skip to the next reel on failure. ENDED → next behavior is unchanged.

---

## External conditions (not product bugs)

- **Captive portals** must be completed before HTTPS to Tipmanna or YouTube works.
- **Enterprise filters**, DNS sinkholes, and **streaming category blocks** are network policy issues.
- **Slow** networks may delay PLAYING without a hard block; users can wait, switch network, or use Retry / Tap to play as appropriate.

---

## What users should do

1. Finish **Wi‑Fi login / captive portal** if prompted.
2. Try **mobile data** or a network known to allow YouTube.
3. Ask the **venue** to allow YouTube hostnames (see ops allowlist doc).
4. On TV, use **Retry** on the network notice or reload the page.
5. On Explore, use **Tap to play** or the **sound** control after the reel is playing.
6. Contact Tipmanna support with: device, browser, network type (guest/enterprise), and whether Tipmanna loaded but video did not.

---

## What support should not promise

- Tipmanna cannot play video when `googlevideo.com` or the IFrame API is blocked—there is no Tipmanna-only workaround in the client.
- Fixing venue firewalls is required for reliable TV/Explore video on restricted Wi‑Fi.

---

## Cross-references

- TV system (playback lock): `product-behaviors/tv-system-product-behavior.md`
- Explore feed: `product-behaviors/explore-feed-product-behavior.md`
- Media/audio policy: `product-behaviors/media-playback-and-audio-policy.md`
