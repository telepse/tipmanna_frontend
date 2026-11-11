# TV playback contract (benchmark snapshot)

**Restored 2026-11-10 after file loss; source: in-session reads + `tv-playback-contract.spec.ts` on `bb4e852`.**

Engine files (must stay matching): `tv-provider.tsx`, `tv-looper.tsx`, `tv-player.tsx`, `tv-autoplay.ts`, `tv-player-resume.ts`, `use-tv-player-controls.ts`.

## LOCKED PLAYBACK CONTRACT (summary)

1. **`requestPlayback`** — After muted load prep + `player.load()`, return. Never gesture-play in the same turn as load.
2. **User gesture play** — One `playWithUserGesture` in the click/tap handler.
3. **`playWithUserGesture`** — Play only (stay muted). Never unmute here.
4. **Session audio restore** — `onPlayerReady` applies mute pref; after CUED/PLAYING, `applyPendingAudioRestore` may unmute only when session unlocked.
5. **Same-id replay** — May unmute in click only when already PLAYING/BUFFERING/CUED.
6. **Auto-advance** — CUED/PLAYING restore via `applyPendingAudioRestore`; CUED auto-play only while muted.
7. **Go Live / live join** — `syncToLive(): boolean`; pending clears only on `true`. No `resolveGoLiveAction` / mode_only / noop shortcuts.
7c. **Player-visible lifecycle** — `setPlayerVisible` stable; schedule refresh must not remount looper cleanup.
7d. **Payment pause holds** — overlay vs session; `resumeAfterPayment` captures tip success once.
7e. **Go Live transition** — suppress pause/seek→LOCAL while active; no timeout.
7f. **PPLA (Case D)** — GLOBAL-origin success restores LOCAL axis, not wall-clock GLOBAL.
7g. **Starting-notice PPLA exit** — dismiss clears PPLA before snapshot restore.
7h. **Forward-only same-row drift** — suppress backward drift seeks while GLOBAL PLAYING on live row.
7a. **Cold live embed (C1)** — env-gated live `startOffsetSeconds` on cold open.
7b. **Readiness flush** — single-shot per `startupEmbedGeneration`.
8. **Leave/return & stay-on-page recovery** — remount rules; orphan / command-dead / both-dead thresholds; never null `playerRef` while looper mounted.
8a. **Tab snapshot vs Live TV** — skip LOCAL restore when GLOBAL/pending; GLOBAL snapshot arms pending without nested flush.
8b. **Transport intent** — pause only if PLAYING/BUFFERING; else play.
8c. **Broadcast axis** — no packed-duration fallthrough on axis gaps.
8d. **Now-playing highlight** — GLOBAL pin uses `currentIndex`.
8e. **Index residual** — accepted polish under C0/stability suppress.
9. **Forbidden regressions** — listed in product behavior / contract tests.

## Spec mapping (`src/lib/__tests__/tv-playback-contract.spec.ts`)

| Contract focus | Test title |
|----------------|------------|
| 3 | playWithUserGesture never unmutes before the new id is CUED |
| 4 / 6 | applyPendingAudioRestore plays muted then unmutes after CUED |
| 1 | requestPlayback does not call playWithUserGesture immediately after player.load |
| 1 / sync | requestPlayback skip_reload path does not inject play on syncToLive |
| 8 | remount bumps embed generation without nulling playerRef while mounted |
| 7 | Go Live resets lastSyncedIndex and calls syncToLive without resolveGoLiveAction |
| 4 | onPlayerReady applies session mute pref (mute or unmute) |
| 4 | applyPendingAudioRestore re-applies mute when session pref is muted |
| 8 | firstPlayReached is marked on PLAYING without C0 env gate |
| 8 | command-dead remount restores anti-trap recovery timers |
| 7 | durable Go Live sets pendingLiveSync when syncToLive is blocked |
| 7b | readiness flush is single-shot per startupEmbedGeneration |
| 7b | looper onReady does not double-flush pending playback beside setPlayerVisible |
| 8a | tab snapshot LOCAL restore is skipped when GLOBAL or pending live |
| 8a | GLOBAL tab snapshot arms pending without nested readiness flush |
| 7 / C0 | C0 debt apply at first PLAYING is mutually exclusive with pending flush |
| 7 | enterLocalMode clears pending live sync |
| 8b | transport intent uses resolvePendingTransportIntent |
| 8d | GLOBAL playlist playing pin binds currentIndex from useTV |
| 8 | loopers key TvPlayer by startupEmbedGeneration for ref rebind |
| 7 | explicit Go Live suppresses duplicate GLOBAL mode-effect initial sync |
| 7c | setPlayerVisible stays stable and uses runReadinessFlushRef |
| 7d | payment redirect snapshot arms session pause hold |
| 7f | resumeAfterPayment restores PPLA for GLOBAL-origin success (not enterGlobalMode as Case D) |
| 8 | transport clears on schedule source change; remount relies on TvPlayer epoch |
| 8 | destroys the YT player on unmount, not in construct-effect cleanup |
| 8 | isReady uses playback API only (isYoutubePlayerCommandReady) |
| 8 | does not reject onReady with module-level commandGeneration |

Unmapped narrative items (7g, 7h, 7a, 8c, 8e) remain **code-enforced** in `tv-provider` / helpers; no dedicated contract-spec title — listed as CORRECTED in restoration audit.
