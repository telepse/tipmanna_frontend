# TV Startup Phase C1 — Initial Live-Offset Embed

Phase C1 eliminates the post-ready `loadVideoById` on clean global/community cold
starts by embedding the resolved live video at `playerVars.start`, seeding
orchestration state from the committed iframe target, and skipping the redundant
first `syncToLive` reload.

**Requires Phase C0** (`NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1`) for pre-play
seek suppression and error containment. C1 is independent via its own flag.

---

## Phase C0 sequence (flag off — unchanged)

1. T6 resolves live index + offset → `lastLivePosition`
2. Looper mounts TvPlayer at **offset 0**
3. T8 `onReady` → `syncToLive` → `loadVideoById(vid, liveOffset)`
4. T9 = first `orchestrated_playback_command_issued`
5. T10/T11 buffering/playing

## Phase C1 clean sequence (C1 + C0 on)

1. T6 creates **provisional** `InitialTvPlaybackTarget` (not seeded to orchestration)
2. Looper computes **actual embed offset** at mount (elapsed-time adjusted)
3. TvPlayer iframe created with `playerVars.start`
4. `initial_live_offset_embed_committed` → provider seeds `orchestratedPlaybackRef`
5. T8 `onReady` → `initial_live_offset_embed_confirmed` → **T9**
6. C1 success confirmed via Route A (sync) or Route B (first-PLAYING fallback)
7. No post-ready `loadVideoById` on clean path

### Why the first sanity run missed confirmation (C1.1 fix)

On the clean autoplay path, embed commit seeds `lastSyncedIndex`, so the first
`syncToLive` takes the **same-index branch** (not `requestPlayback`). Phase C0
suppresses the pre-play drift seek. The iframe autoplays successfully, but C1.0
only emitted success inside `requestPlayback` — which this path never reached.

Phase C1.1 adds explicit confirmation on the same-index sync path and a
first-PLAYING fallback when autoplay wins the race.

---

## Phase C1.1 success confirmation

Success is recorded **once** per startup generation when the committed live-offset
iframe is proven valid and no replacement load occurred before first PLAYING.

### Triggers (`initialEmbedSuccessTrigger`)

| Trigger                       | Route                                               | Sets `initialEmbedTargetMatchedFirstSync` |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------- |
| `first_sync_request_playback` | A1 — `requestPlayback` skip via elapsed-aware match | yes                                       |
| `first_sync_same_index`       | A2 — same-index `syncToLive` before first PLAYING   | yes                                       |
| `first_playing_fallback`      | B — first PLAYING before Route A records            | **no**                                    |

### Summary field semantics

| Field                                | Meaning                                                              |
| ------------------------------------ | -------------------------------------------------------------------- |
| `initialEmbedTargetConfirmed`        | C1 target safely confirmed by any valid route                        |
| `initialEmbedTargetMatchedFirstSync` | Confirmation via an actual sync comparison (A1 or A2)                |
| `initialReloadAvoided`               | No replacement `loadVideoById` before first PLAYING                  |
| `initialEmbedSuccessTrigger`         | Which route recorded success                                         |
| `firstBufferingRelativeToPlaying`    | `before` / `after` / null — diagnostic only; T10/T11 marks unchanged |

A clean autoplay path may show:

```
initialEmbedTargetConfirmed: true
initialEmbedTargetMatchedFirstSync: false
initialEmbedSuccessTrigger: "first_playing_fallback"
initialReloadAvoided: true
```

Route B safety: rejects stale generation, source/community/video/index mismatch,
elapsed-offset drift beyond ±3s, any pre-play replacement `loadVideoById`, or any
executed pre-play `seekTo` (suppressed seeks do not block confirmation).

---

## Feature flag

```
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=0   # default — Phase C0 path
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=1   # Phase C1
```

Frontend rebuild required. Independent from C0 flag.

---

## Initial target ownership

`TVProvider` owns `InitialTvPlaybackTarget` (provisional at T6). Looper reads
it read-only. TvPlayer commits exact video/offset via callback. Provider seeds
orchestration only from commit — not from T6 alone.

---

## Remount policy

Player key: `tv-embed-gen-${startupEmbedGeneration}`. Generation increments only
on source reset / new cold startup. **Not** keyed on schedule revision, index,
or offset ticks. Post-first-play rollovers use imperative `loadVideoById`.

---

## T9 semantics (C1)

T9 = `initial_live_offset_embed_confirmed` at or after T8 when target still valid.
Represents confirmation of the initial orchestrated embed, not iframe constructor time.

---

## Staging validation

Enable:

```
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=1
TV_SCHEDULE_EXISTENCE_FAST_PATH=0
```

Clean path expectations: `initialEmbedCount=1`, `loadVideoByIdCount=0`,
`initialEmbedTargetConfirmed=true`, `initialReloadAvoided=true`,
`initialEmbedUsedResolvedTarget=true`.

Either sync confirmation or fallback is acceptable:

- Sync path: `initialEmbedTargetMatchedFirstSync=true`, trigger `first_sync_*`
- Autoplay path: `initialEmbedTargetMatchedFirstSync=false`, trigger `first_playing_fallback`

Use `scheduleRequestTriggers` / `scheduleAttemptTriggerById` to identify background
schedule refreshes (out of scope for C1.1 behavior changes).

---

## Rollback

Set `NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=0`, rebuild frontend. Phase C0
remains active.

---

## Not implemented

C1b preconnect, Phase D overlay, backend optimizations, community source-picker
redesign.
