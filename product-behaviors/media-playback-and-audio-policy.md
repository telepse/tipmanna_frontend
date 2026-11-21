# Media playback and audio policy

Single source: `product-behaviors/`.

Session preference (`tipmanna_session_sound_on`) is authoritative for **this tab**. Storage: `src/lib/session-audio.ts` (`sessionStorage`).

## Explore reel audio

- Explore uses `resolveExploreReelPlayerAudioProps` (`src/lib/explore-reel-audio-policy.ts`):
  - **Non-iOS:** `restoreSessionSoundOnProgrammaticPlay: true`; `initialMuted` follows session want-sound.
  - **iOS WebKit:** programmatic restore **off**; muted start when want-sound; **Tap for sound** on user gesture.
- `VideoPlayer.syncMuteFromPlayer` suppresses stale muted reports only when programmatic restore is **on** (other surfaces unchanged).
- Reel speaker button persists via `setSessionSoundOn` / `VideoPlayer.unmute()`.
- Intent grace: `src/lib/player-audio-intent.ts` (`PLAYER_AUDIO_INTENT_GRACE_MS`).

## TV autoplay (gesture-safe)

See **LOCKED PLAYBACK CONTRACT** in `product-behaviors/tv-system-product-behavior.md` and `src/lib/tv-autoplay.ts`. TV does **not** use `VideoPlayer`.

## Surface-specific playback

Tip-drawer / payment return: `payment-transaction-and-return-state.md` (when restored) and `use-payment-playback-restore.ts`.

## Feature-card overlay pause

Non-TV surfaces pause on feature-card overlay via `createFeatureCardOverlayPlaybackHandlers()`. TV uses `TVProvider` overlay pause — must not enter LOCAL mode.
