# TV Startup Phase C0 — Player Error and Startup Seek Containment

Phase C0 addresses startup latency dominated by the YouTube player path: unbounded
error recovery (`goLive()` loops) and repeated pre-first-play drift `seekTo` calls
while `getCurrentTime()` is still zero or stale.

**Scope:** Frontend-only, behind `NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD`. Does not
change backend schedule code, Phase A schedule behavior, Phase B1, embed position,
initial `loadVideoById`, overlay, service worker, or full Phase C/D.

---

## 1. Legacy error / recovery sequence

1. YouTube `onError` in `TvPlayer` forwards `event.data` (numeric code) to the looper.
2. Looper `handlePlayerError()` **dropped the code**, emitted a generic `player_error`
   trace, and called `goLive()` in GLOBAL mode (once per URL via `videoErrorReloadsRef`).
3. `goLive()` → `enterGlobalMode()` → `syncToLive()` → `requestPlayback()` /
   drift `seekTo`.
4. Each new effective URL reset the per-URL reload counter, allowing **cross-video
   recovery chains**.
5. Periodic `syncToLive` (every 3s) could issue drift `seekTo` before state `PLAYING`,
   because drift correction had no pre-play guard.

---

## 2. Phase C0 guarded sequence

When `NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1`:

1. Looper forwards numeric `youtubeErrorCode` to `TVProvider.handleStartupPlayerError`.
2. Provider records `player_error` with code hash, index, player state, recovery count.
3. `classifyStartupPlayerError()` chooses: skip failed target, advance next, retry
   once (transient/unknown), cap reached, or legacy (post-first-play).
4. Recoveries consume a **startup-wide budget** (`MAX_STARTUP_PLAYER_RECOVERIES = 3`)
   until first successful PLAYING.
5. Permanent codes (100, 101, 150) mark the target failed and advance via schedule
   navigation — no repeated load of the same video.
6. Transient codes (2, 5) allow one automatic retry per target within the cap.
7. Pre-first-play periodic drift seeks are suppressed; desired live offset is retained
   in guard state for post-play sync.
8. Duplicate equivalent `loadVideoById` while in-flight/buffering the same target
   is suppressed.
9. `syncToLive` skips failed targets until first PLAYING via
   `resolvePositionSkippingFailedTargets`.
10. First PLAYING → `notifyStartupPlayerPlaying()` → `first_play_guard_released`;
    normal drift sync resumes.

When the flag is **off**, provider delegates to the legacy once-per-navigation reload
(`goLive` / `reloadCurrentPlaybackAt`).

---

## 3. YouTube error-code forwarding and classification

| Code     | Kind              | Policy (pre-first-play)                |
| -------- | ----------------- | -------------------------------------- |
| 100      | permanent_content | Mark failed, advance next (1 recovery) |
| 101, 150 | permanent_content | Embedding disallowed — same as above   |
| 2, 5     | transient_player  | One retry per target, then advance     |
| other    | unknown           | One conservative retry, then advance   |

Codes follow the [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference#Events).
Implementation: `classifyYoutubeErrorKind()` / `classifyStartupPlayerError()` in
`frontend/src/lib/tv-startup-playback-guard.ts`.

Trace records `youtubeErrorCode` on `player_error` and aggregates
`youtubeErrorCodeCounts` in the finalized summary. Video IDs are never logged in full —
only `videoIdHash`.

---

## 4. Startup recovery cap

- Constant: `MAX_STARTUP_PLAYER_RECOVERIES = 3`
- Applies from initial player startup until first PLAYING; does **not** reset on URL
  change.
- After cap: no automatic `goLive()` / load loop; `startup_recovery_cap_reached`
  emitted; existing error/fallback UI remains.
- Post-first-play: legacy per-video error handling resumes.

---

## 5. Pre-first-play seek policy

- Initial orchestrated `loadVideoById` at resolved live offset is **always** allowed.
- Index rollover and genuine video changes still issue required loads.
- Same-index drift correction (`syncToLive` + `|actual - target| > 3s`) is suppressed
  until first PLAYING when the guard is on.
- Suppression emits `pre_play_drift_seek_suppressed`; `pendingLiveOffsetSeconds` retained.

---

## 6. Duplicate-load guard

`shouldSuppressDuplicatePrePlayLoad()` compares video id, start offset, orchestrated
state, in-flight video id, and player state. Exempt reasons: `startup_error_recovery`,
`startup_error_advance`, `error_reload`, `enforcement`, `loadLocal`. Emits
`duplicate_pre_play_load_suppressed`.

---

## 7. Files modified

| File                                                           | Change                              |
| -------------------------------------------------------------- | ----------------------------------- |
| `frontend/src/lib/tv-startup-playback-guard.ts`                | **New** — pure guard helpers        |
| `frontend/src/lib/tv-feature-flags.ts`                         | `isTvStartupPlaybackGuardEnabled()` |
| `frontend/src/lib/tv-playback-request.ts`                      | Recovery reason strings             |
| `frontend/src/lib/tv-startup-trace.ts`                         | C0 summary fields + event counters  |
| `frontend/src/components/tv-provider.tsx`                      | Guard integration                   |
| `frontend/src/components/tv/tv-looper.tsx`                     | Forward error code + first play     |
| `frontend/src/components/tv/web-tv-looper.tsx`                 | Same                                |
| `frontend/src/lib/__tests__/tv-startup-playback-guard.spec.ts` | **New**                             |
| `frontend/src/lib/__tests__/tv-startup-trace.spec.ts`          | C0 counter tests                    |
| `frontend/.env`                                                | Document flag (default `0`)         |
| `docs/tv-startup-latency-measurement-protocol.md`              | Phase C0 section                    |
| `docs/tv-startup-phase-c0-report.md`                           | This document                       |

---

## 8. Feature flag

```
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=0   # default — legacy behavior
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1   # Phase C0 guarded behavior
```

Requires **frontend rebuild**. Not coupled to startup tracing.

---

## 9. Trace events and summary fields

**Events:** `youtube_error_classified`, `startup_error_recovery_started`,
`startup_error_target_skipped`, `startup_recovery_cap_reached`,
`pre_play_drift_seek_suppressed`, `duplicate_pre_play_load_suppressed`,
`first_play_guard_released`

**Summary additions:** `youtubeErrorCodeCounts`, `startupRecoveryCount`,
`startupRecoveryCapReached`, `prePlaySeekSuppressedCount`,
`duplicateLoadSuppressedCount`, `failedStartupTargetCount`

---

## 10. Deployment

Staging (validation):

```
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
TV_SCHEDULE_EXISTENCE_FAST_PATH=0
TV_STARTUP_BACKEND_TRACE=1
```

Rebuild and deploy frontend. Backend env unchanged for C0.

---

## 11. Rollback

Set `NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=0`, rebuild frontend, redeploy. No database
or backend migration required.

---

## 12. Limitations

- Does not eliminate YouTube errors — bounds recovery and pre-play seek storms.
- Does not use `playerVars.start` or embed-at-offset (full Phase C).
- Failed-target skip in `syncToLive` applies only before first PLAYING.
- `MAX_STARTUP_PLAYER_RECOVERIES = 3` matches legacy “small number of tries” semantics
  while preventing unbounded cross-video chains.

---

## 13. Acceptance gate (five global cold runs)

See `docs/tv-startup-latency-measurement-protocol.md` § Phase C0 validation.
