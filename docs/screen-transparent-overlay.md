# Transparent screen overlay — OBS operator manual

**Product behavior (source of truth):** [screen-display-and-overlay-product-behavior.md](../../product-behaviors/screen-display-and-overlay-product-behavior.md)

## What this URL is

Public route: **`/room/{eventId}/overlay`**

Hosts copy it from **Screen Display Settings → Copy Overlay Link**. The copied URL uses your **current browser origin** (staging vs production):

`{window.location.origin}/room/{eventId}/overlay`

Use this page as an **OBS Browser Source** (or similar) over your live programme. The page background is **transparent**; only the fundraise HUD, funnel, pin roster (when enabled), and tip animations render.

The opaque **Screen Display** at `/room/{eventId}/screen` is a separate surface (full background, video, QR, back control). Do not substitute one URL for the other.

## OBS setup (recommended)

1. In Tipmanna, open the event → **Screen Display Settings** → **Copy Overlay Link**.
2. In OBS: **Sources → + → Browser**.
3. Paste the overlay URL. Set width/height to your stream resolution (e.g. 1920×1080).
4. Enable **Shutdown source when not visible** if you want to save resources when the scene is inactive.
5. If your OBS build offers **Custom CSS** or a transparency option for Browser Sources, leave defaults unless you see a non-transparent flash on load; the app sets transparent `html`/`body` before first paint on this route only.
6. Position the source **above** your camera/programme layers. Tip animations play full-stage on this layer.

## What viewers see

- Progress and amounts (together raised or latest tip, per host settings)
- Event name (overlay styling with drop shadow)
- Bouncing funnel button (`#funnel-btn`) in the host-selected corner
- Pinned performer/project roster when **Show pinned roster on screen and overlay** is on (overlay roster is always expanded when visible)
- Full-screen tip animations (`overlay-` playback prefix); **no** payer-origin recovery on this surface

## Live updates

The overlay PC is usually **logged out**. It listens on the **public** Pusher channel `event-{eventId}` only:

- `screen-display-state` — settings, amounts, roster
- `event-amount-updated` — totals and pin amounts (empty pin arrays clear the roster HUD)
- `latest-tip-updated`, `session-activated`

It does **not** use the private event channel.

## Access and approval

Same access rules as the event room and `/screen`. If the event is **not approved**, the overlay shows the locked state and does **not** mount the live HUD (avoid leaking an active overlay URL for unapproved events).

## Troubleshooting

| Issue                           | Check                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solid white/black behind HUD    | Browser Source URL must be `/overlay`, not `/screen`. Refresh the source after copying a new link.                                                                          |
| HUD frozen                      | Venue PC needs network access to Tipmanna and Pusher; confirm the event is approved and live.                                                                               |
| Pin roster stuck after unpin    | Ensure backend and frontend are on the same release (empty pin arrays on `event-amount-updated`). Toggle pin again or save screen settings to force `screen-display-state`. |
| Toasts or loading bar on stream | Global toast and nav progress are suppressed on overlay paths; update frontend if you still see them.                                                                       |
| PWA / notification prompts      | Suppressed on overlay; should not appear on venue PC.                                                                                                                       |

## Host settings that affect overlay

- **Show pinned roster on screen and overlay** — hides pin HUD on both opaque screen and overlay when off
- **Funnel position** — corner for the funnel on both surfaces
- Other screen settings (background, latest vs together, progress bar visibility) mirror to overlay via realtime broadcasts
