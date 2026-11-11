# Explore Feed — Product Behavior Guide

**Audience:** Product, design, and engineering teams working on Explore reels (homepage), subtabs, and TV handoff.

Session sound preference is **per browser tab** (`sessionStorage` via `src/lib/session-audio.ts`).

---

## LOCKED EXPLORE CONTRACT

Do not change without updating this section, `.cursor/rules/explore-golden-lock.mdc`, and `src/lib/__tests__/explore-contract.spec.ts` (and policy tests).

### Platform audio (after `6a1880c` fix)

| Situation | Non-iOS | iOS / iPadOS WebKit |
|-----------|---------|---------------------|
| Swipe / ENDED / remount, sound on | Next reel unmuted via programmatic restore; scrubber via activation | Starts muted; **Tap for sound** |
| Sound off | Muted | Muted |
| First tap on playing muted reel | `unmute_and_engage` (no pause) | Same |
| Tap before PLAYING | `play_and_unmute` | Same |
| Speaker icon | Matches player `isMuted()` | Same |

Policy: `src/lib/explore-reel-audio-policy.ts`. Wiring: `explore-feed-client.tsx` (`exploreReelAudioProps`, `resolveExploreReelTapAction`).

### Feed integrity

- ENDED → next: same-turn `activeIndex` + snap scroll; pagination near end; **no wrap** to index 0 (`explore-reel-advance.ts`).
- Preload band ± window; **400ms dwell** before off-active iframe mount.
- Long-lived reel: `feedSurfaceActive` pauses; subtabs do not destroy feed array.
- Open-in-reel: **no reorder** of existing row to index 0.
- Never-PLAYING: ~8s overlay, no auto-skip (`explore-never-playing-recovery.ts`).
- Tip drawer: snapshot offset + mute; restore on close (`usePaymentPlaybackRestore`).

---

## Feed modes

| Mode | Scope | Auth |
|------|-------|------|
| **Trends** | Global approved catalog | Anonymous OK |
| **Saves** | Tipper saves | Sign-in |
| **Community** | Approved bank for selected communities | Sign-in |

Trends batch requests stay global; `communityIds` only when `feedMode === "community"`.

---

## Watch TV handoff

Reel dock **Watch TV** → immediate `/tv` (optional hover prefetch only). In-page TV subtab is schedule preview, not full TV.

---

## Key files

| Area | Path |
|------|------|
| Reel feed | `src/components/explore/explore-feed-client.tsx` |
| Audio policy | `src/lib/explore-reel-audio-policy.ts` |
| Never-PLAYING | `src/lib/explore-never-playing-recovery.ts` |
| Advance | `src/lib/explore-reel-advance.ts` |
| Reel player | `src/components/events/video-player.tsx` |

---

## Related docs

- `product-behaviors/media-playback-and-audio-policy.md`
- `product-behaviors/restricted-networks-and-youtube.md`
- `docs/explore-lock/README.md`
