# TV Startup Phase C0.1 — Stable-Playback Recovery Guard

Phase C0.1 extends startup error recovery and seek containment **until T13 stable
playback**, not merely until the first PLAYING event (T11).

**Requires Phase C0** (`NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1`). Independent flag.

---

## Why T11 was insufficient

Phase C0 released startup recovery restrictions at first PLAYING. On the C1/C1.1
clean path, the initial live-offset embed succeeds and T11 fires, but playback may
still rebuffer or hit YouTube errors (e.g. code 150) before the 2-second stability
window completes.

When recovery released at T11:

1. Second error used legacy per-video reload instead of bounded startup recovery
2. `startupRecoveryCount` did not increment for post-first-play errors
3. Repeated `syncToLive` drift seeks during rebuffering caused command storms
4. Trace finalized as `failed` at ~90s without T13

---

## T11 vs T13 lifecycle

| Milestone               | Effect                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **T11 first PLAYING**   | Marks `firstPlayReached`; releases pre-play drift seek suppression only              |
| **T11–T13 window**      | Stability guard active (when C0.1 enabled): bounded recovery, pre-stable seek policy |
| **T13 stable_playback** | Marks `stablePlaybackReached`; releases stability guard; normal runtime behavior     |

With C0.1 **disabled**, behavior matches Phase C0 (recovery releases at T11).

---

## Feature flag

```
NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=0   # default — Phase C0 T11 release
NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=1   # Phase C0.1 — contain until T13
```

Requires `NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1` and frontend rebuild.

---

## Pre-stable error handling

Before T13 (with C0.1 on), errors use the C0 classified startup recovery path even
after T11:

- Codes 100, 101, 150 → mark target failed, advance to next eligible, consume budget
- Transient/unknown → retry once per target, then advance
- Cap = 3 recoveries (`MAX_STARTUP_PLAYER_RECOVERIES`)
- Lifecycle trace context: `before_first_play`, `after_first_play_before_stable`, `after_stable`

After T13 → existing legacy per-video error behavior.

---

## Pre-stable seek policy

| Phase      | Drift seek behavior                                                    |
| ---------- | ---------------------------------------------------------------------- |
| Before T11 | Existing C0: suppress all pre-play drift seeks                         |
| T11–T13    | Suppress while BUFFERING/UNSTARTED/CUED/ENDED/PAUSED                   |
| T11–T13    | Allow **one** corrective same-video drift seek while genuinely PLAYING |
| After T13  | Restore recurring 3s drift synchronization                             |

Summary counters: `preStableSeekSuppressedCount`, `preStableCorrectiveSeekCount`.

---

## Recovery cap and terminal failure

- Recovery budget **does not reset** at T11
- Video URL changes do **not** reset the startup-wide budget
- Failed targets remain skipped until stable or terminal failure
- When cap reached before T13: emit `startup_terminal_failure`, block further automatic loads/seeks, finalize trace (no 90s command storm)

---

## C1/C1.1 field preservation

These describe **initial redundant reload avoidance**, not zero loads for entire startup:

- `initialEmbedTargetConfirmed`
- `initialEmbedTargetMatchedFirstSync`
- `initialReloadAvoided`
- `initialEmbedSuccessTrigger`

They remain true when C1 embed succeeded even if later recovery loads occur
(`loadVideoByIdCount` may be > 0 after recovery).

---

## Staging validation

Enable with C0 + C1 + trace:

```
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=1
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=1
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
```

**Clean cold baseline:** keep tab visible until T13; do not switch windows (visibility refreshes are out of scope and invalidate cold baseline).

**Pass criteria:**

- `initialEmbedTargetConfirmed=true`, `initialReloadAvoided=true`
- `finalState=stable`, T13 present
- `startupStabilityGuardReleased=true`
- `startupStabilityGuardReleaseReason=stable_playback`
- `startupStabilityGuardReleasedAtMs` present (≤ T13 mark elapsed ms)

### Phase C0.1a — release-before-finalization consistency

Previous lifecycle bug: trace could finalize at T13 **before** `startup_stability_guard_released`
was recorded when release was delegated to a late-registered provider listener. That produced
impossible summary pairs (`released: false` with `releaseReason: stable_playback` in event
logs) and post-finalization release events.

**Corrected stable order:**

1. 2s uninterrupted PLAYING
2. `releaseStartupStabilityGuardOnce(stable_playback)` — functional guard + trace event
3. `stable_playback` (T13)
4. Summary finalized (immutable)

**Terminal failure order:**

1. `markStartupTerminalFailure` (block orchestration)
2. `startup_terminal_failure`
3. `releaseStartupStabilityGuardOnce(terminal_failure)`
4. Failed summary finalized

**Invariants (flag on):** never `released=false` with non-null reason; diagnostic
`stability_release_missing_before_finalization` if finalize attempted without release.

Post-finalization runtime events (sync interval, player state) may continue and increment
`postFinalizationEventCount` but must not mutate release fields.

**Code-150 recovery validation:** if errors occur before T13, expect `startupRecoveryCount` to reflect each recovery and `postFirstPlayPreStableErrorCount` ≥ 1 when error is after T11.

---

## Rollback

Set `NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=0`, rebuild frontend. Phase C0/C1 unchanged.

---

## Not implemented

Visibility refresh suppression, Phase D, backend changes, C1 embed architecture changes.
