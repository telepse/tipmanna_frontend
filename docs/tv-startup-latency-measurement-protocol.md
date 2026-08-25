# TV Startup Latency — Measurement Protocol (Phase 1)

This document explains how to use the **Phase 1 diagnostic instrumentation** to
measure Time to First Visible Video (TTFV) on the Tipmanna `/tv` page.

> This instrumentation is **measurement only**. It never changes TV startup,
> schedule fetching, retry timing, service-worker caching, autoplay/mute, player
> loading commands, sync effects, SSR flags, overlay behaviour, or the API
> response body. When tracing is disabled the build behaves identically.

The goal of this phase is to produce **trustworthy evidence** of where the 30–60s
startup time is spent, _before_ selecting any optimization.

---

## 1. Concepts

- **Frontend trace** — structured console events with the prefix
  `[TV_STARTUP_TRACE]`, one correlation ID per `/tv` navigation.
- **Backend trace** — structured console events with the prefix
  `[TV_STARTUP_BACKEND_TRACE]` plus an optional `Server-Timing` response header.
- **Correlation ID** — a safe random ID generated once per page load, sent to the
  backend as the `X-TV-Startup-Trace-Id` request header on the initial schedule
  request. It contains no user ID, token, cookie, or private content.
- **Canonical marks** — `T0`–`T13`, each also written as a `performance.mark()`
  under the `tv-startup:*` namespace (see §11). These are separate from the
  pre-existing internal `tvLoadMark` (`tv:T0..T6`) marks, which are left intact.

### Canonical event → mark map

| Mark | Event                                | Meaning                                   |
| ---- | ------------------------------------ | ----------------------------------------- |
| T0   | `navigation_start`                   | Navigation origin (`performance.timeOrigin`) |
| T1   | `html_response_start`                | `PerformanceNavigationTiming.responseStart` |
| T2   | `tv_provider_mounted`                | `TVProvider` mounted (client)             |
| T3   | `schedule_request_started`           | Schedule network request begins           |
| —    | `schedule_request_finished`          | Request outcome (success/304/failure/stale) |
| T4   | `schedule_payload_accepted`          | Payload applied (network/session/fallback) |
| T5   | `playlist_selected`                  | Playlist chosen (ongoing/alt/fallback/notice) |
| T6   | `initial_playback_position_resolved` | Live index + offset resolved              |
| —    | `player_component_mounted`           | `TvPlayer` mounted (pre-iframe)           |
| T7   | `youtube_api_available`              | YouTube IFrame API object observed (approx, see §14) |
| T8   | `player_ready`                       | YouTube `onReady`                         |
| T9   | `playback_command_issued`            | initial embed / loadVideoById / seekTo / playVideo |
| T10  | `player_buffering`                   | First player state `3`                    |
| T11  | `player_playing`                     | First player state `1` (first visible frame) |
| T12  | `player_overlay_removed`             | `isPlayerLoading` became false            |
| T13  | `stable_playback`                    | 2s of uninterrupted playback              |
| —    | `startup_failed`                     | No stable playback achieved               |

---

## 2. How to enable tracing

Any **one** of the following enables the frontend trace:

1. **Environment flag** (persisted, best for staging):

   ```
   NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
   ```

   (`1` or `true` only; any other value is treated as disabled.) Rebuild/redeploy
   the frontend for the env change to take effect.

2. **Query parameter** (per-session, no rebuild):

   ```
   https://<host>/tv?tvDebug=1
   ```

The backend trace activates automatically for a request when either:

- the request carries an `X-TV-Startup-Trace-Id` header (the frontend sends this
  automatically on the **initial** schedule request when tracing is enabled), or
- the backend env flag `TV_STARTUP_BACKEND_TRACE=1` is set.

## 3. How to disable tracing

- Remove/leave unset `NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED` (or set to `0`).
- Do not append `?tvDebug=1`.
- Leave `TV_STARTUP_BACKEND_TRACE` unset on the backend.

When disabled, no `[TV_STARTUP_TRACE]` / `[TV_STARTUP_BACKEND_TRACE]` output is
produced, no `X-TV-Startup-Trace-Id` header is sent, no `Server-Timing` header is
added, and no `sessionStorage` writes occur.

---

## 4. How to perform a cold load

A "cold" load exercises the slow path (no warm caches):

1. Open Chrome DevTools → **Network** tab → check **Disable cache**.
2. Application tab → **Storage** → **Clear site data** (clears `sessionStorage`
   SWR cache, service worker, and other caches).
3. Optionally throttle: Network → **No throttling** for warm baselines, or a
   fixed profile (e.g. "Fast 4G") for a repeatable slow baseline. Keep the same
   profile across a run.
4. Hard-navigate to `/tv?tvDebug=1` (type the URL and press Enter; do not use
   in-app SPA navigation for cold runs).

A "warm" load repeats step 4 without clearing storage.

## 5. How to unregister / bypass the service worker

The service worker (Serwist) can mask real network timing. To bypass it:

- **Bypass for a session:** DevTools → **Application** → **Service Workers** →
  check **Bypass for network**. Reload.
- **Full unregister:** Application → Service Workers → **Unregister**, then
  Application → Storage → **Clear site data**, then reload.
- Confirm the schedule request appears in the Network tab as a real network call
  (not "(ServiceWorker)") when measuring cold network latency.

---

## 6. How to collect the trace summary

While on the `/tv` page (tracing enabled), open the DevTools Console:

```js
// Latest run (in-flight or last finalized), as a JS object:
window.__TIPMANNA_TV_STARTUP_TRACE__.getLatest();

// All persisted runs (bounded to the most recent 25):
window.__TIPMANNA_TV_STARTUP_TRACE__.getAll();

// Copy the latest summary JSON to the clipboard (and return the string):
window.__TIPMANNA_TV_STARTUP_TRACE__.copyLatest();

// Clear stored history:
window.__TIPMANNA_TV_STARTUP_TRACE__.clear();
```

Summaries are also persisted in
`sessionStorage['tipmanna-tv-startup-traces-v1']` (max 25 runs).

Each summary contains: `traceId`, `marks` (`T0..T13`), per-segment durations,
`totalTtfvMs`, `stableTtfvMs`, schedule attempt/retry counts, player load/seek/
sync/index-change/error counts, which retry delay occurred (10s/30s/60s),
whether backend rebuilding occurred, the schedule response source
(network/304/session_cache/fallback_cache), and the final success/failure state.

## 7. How to capture the Network waterfall

1. DevTools → **Network**, keep it open **before** navigating.
2. Cold-load `/tv?tvDebug=1` (see §4).
3. Filter to `schedule` to isolate the TV schedule request(s).
4. For the schedule request, note **Timing** breakdown (Stalled, TTFB, Content
   Download) and the **Server-Timing** header (visible in the Timing tab when the
   backend trace is active).
5. **Export:** right-click the request list → **Save all as HAR with content**
   for archival alongside the trace summary.

## 8. Identifying server-action vs direct schedule fetch

- The `schedule_request_started` event includes `fetchMode`:
  - `direct_fetch` — a direct `GET /api/v1/tv/schedule` (visible as a normal XHR/
    fetch in the Network tab, honoring `X-TV-Startup-Trace-Id` and ETag).
  - `server_action` — routed through a Next.js server action (appears as a POST to
    the current route with an `Next-Action` header; the schedule call happens
    server-side).
- Direct fetch is controlled by `NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH`. Record
  which mode was active for each run (do not change it mid-run).

## 9. Identifying retry delays

The retry backoff is `RETRY_DELAYS_MS = [10000, 30000, 60000]`.

Look for these events in order:

- `schedule_request_finished` with `outcome: "failure"` → includes the selected
  `retryDelayMs` and whether `scheduleReadyRemainedFalse` / `playerMountPrevented`.
- `retry_scheduled` → `attempt`, `retryDelayMs`, `failureAtMs`.
- `retry_executed` → fired when the retry actually runs.

The summary's `retry10sOccurred` / `retry30sOccurred` / `retry60sOccurred` flags
make it trivial to tell a **60s scheduled retry** apart from a genuinely slow
**60s single load** (a slow single load will show one `schedule_request_started`
with a large `schedule_request_finished.elapsedRequestMs` and **no** retry flags).

## 10. How to record first visible playback

- **T11 `player_playing`** = first YouTube state `1` (first painted frame).
- **T12 `player_overlay_removed`** = the "Loading video…" overlay disappears.
- `totalTtfvMs` in the summary = `max(T11, T12)`.
- **Stable** TTFV = **T13 `stable_playback`** (2s uninterrupted).

Cross-check visually with a screen recording: the moment motion appears on screen
should align with T11; the overlay vanishing should align with T12.

---

## 11. Performance marks

Canonical stages are also emitted via `performance.mark()` (never overwriting
existing marks):

```
tv-startup:navigation-start      (T0)
tv-startup:html-response-start   (T1)
tv-startup:provider-mounted      (T2)
tv-startup:schedule-request-start(T3)
tv-startup:schedule-accepted     (T4)
tv-startup:playlist-selected     (T5)
tv-startup:position-resolved     (T6)
tv-startup:youtube-api           (T7)
tv-startup:player-ready          (T8)
tv-startup:playback-command      (T9)
tv-startup:buffering             (T10)
tv-startup:playing               (T11)
tv-startup:overlay-removed       (T12)
tv-startup:stable-playback       (T13)
```

Inspect in the console:

```js
performance.getEntriesByName("tv-startup:playing");
performance.getEntriesByType("mark").filter(m => m.name.startsWith("tv-startup:"));
```

These also appear in the DevTools **Performance** panel timeline when you record a
profile of the cold load.

---

## 12. Exact 20-run measurement procedure

Run **20 measured loads per configuration cell** (see §15 for cells). For each run:

1. Ensure the correct configuration cell (global vs community; cold vs warm;
   direct-fetch vs server-action). Do not change flags mid-run.
2. For **cold** runs: clear site data + bypass/unregister the service worker (§4, §5).
3. Keep DevTools Network open; keep the same throttling profile for the whole cell.
4. Navigate to `/tv?tvDebug=1` (hard navigation).
5. Wait until **T13 `stable_playback`** (or `startup_failed`).
6. Run `window.__TIPMANNA_TV_STARTUP_TRACE__.copyLatest()` and paste into the
   result table.
7. Save the HAR (§7) with a filename that includes the `traceId`.
8. Repeat for 20 runs. `getAll()` retains the last 25, so export periodically.

Discard and re-run any load where you interacted with the page (clicking,
changing source) before T13, since interaction perturbs the measurement.

### Result table template

| # | traceId | cell | source | mode(fetch) | cold/warm | T0→T2 | T2→T3 | T3→T4 (req ms) | T4→T6 | T6→T8 | T8→T11 | T11→T12 | totalTTFV | stableTTFV | schedAttempts | retries(10/30/60) | scheduleSource | rebuild? | result |
|---|---------|------|--------|-------------|-----------|-------|-------|----------------|-------|-------|--------|---------|-----------|------------|---------------|-------------------|----------------|----------|--------|
| 1 |         |      |        |             |           |       |       |                |       |       |        |         |           |            |               |                   |                |          |        |
| … |         |      |        |             |           |       |       |                |       |       |        |         |           |            |               |                   |                |          |        |

## 13. Statistics to compute (per cell)

From the 20 `totalTtfvMs` (and separately `stableTtfvMs`) values:

- **p50 (median):** sort ascending; value at index `ceil(0.50 × n) − 1`.
- **p75:** value at index `ceil(0.75 × n) − 1`.
- **p95:** value at index `ceil(0.95 × n) − 1`.
- **average (mean):** `sum / n`.
- **min / max:** smallest / largest observed value.

For `n = 20`: p50 ≈ 10th value, p75 ≈ 15th value, p95 ≈ 19th value (sorted).

### Failure rate

```
failureRate = runsWith(startup_failed OR no T13) / totalRuns × 100%
```

### Threshold percentages

```
pctOver15s = countOf(totalTtfvMs > 15000) / totalRuns × 100%
pctOver30s = countOf(totalTtfvMs > 30000) / totalRuns × 100%
```

## 14. Separating configuration cells

Always analyze and report each **cell** independently; never pool across cells:

- **Global vs community:** the `schedule_request_started.scheduleSource` field
  (`global` vs `community`) and the summary `source`. Use a global `/tv` load vs a
  community-scoped load.
- **Cold vs warm:** cold = cleared storage + SW bypassed (§4/§5); warm = repeat
  navigation with caches intact. The summary `scheduleResponseSource`
  (`network` / `304` / `session_cache` / `fallback_cache`) confirms which path ran.
- **Direct-fetch vs server-action:** the `fetchMode` field (§8).

Recommended minimum matrix: {global, community} × {cold, warm} = 4 cells × 20 runs.
Add a direct-fetch/server-action split if that flag varies across environments.

---

## 15. Known limitations

- **T7 `youtube_api_available` is approximate.** `react-youtube`/`youtube-player`
  load the IFrame API script internally, so the exact script-load moment is not
  observable through the library. We emit the closest reliable signal — the first
  time `window.YT.Player` is observed (at player mount, or via a bounded poll that
  only runs while tracing is enabled) — and mark it `approximate: true`.
- **Service worker can mask network timing.** Unless bypassed (§5), the schedule
  request timing may reflect cache behaviour rather than origin latency.
- **`performance.now()` elapsed is relative to `timeOrigin`** (navigation start),
  so T0 is `0` by construction; absolute wall-clock is available via
  `performance.timeOrigin` and the summary `startedAt`.
- **Overlay-removed reason is inferred** from player state at the transition, not
  from the exact caller, because the overlay clears from several call sites.
- The trace history is bounded to 25 runs in `sessionStorage`; export frequently
  during long measurement sessions.

---

## 16. Phase A — single startup schedule (remediation)

Phase A reduces duplicate initial schedule network requests. It is gated by a
**separate** flag from startup tracing:

```
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
```

Default is `0` (legacy startup path). Requires a **frontend rebuild**.

Enable tracing alongside Phase A for validation:

```
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
```

### Expected counts (Phase A enabled, tracing on)

| Scenario | `scheduleNetworkAttemptCount` | `scheduleCacheBootstrapCount` | `scheduleRefreshCountDuringStartup` |
|----------|-------------------------------|-------------------------------|-------------------------------------|
| Cold global (cleared storage) | **1** | **0** | **0** |
| Cold community (initial community source) | **1** | **0** | **0** |
| Warm SWR (valid pre-nav cache) | **1** | **1** | **0** |

### Correlation IDs

- **`traceId`** — one per page navigation (summary root field).
- **`initialScheduleAttemptId`** — first real HTTP attempt.
- **`scheduleAttemptIds[]`** — all real HTTP attempts this navigation.
- **`initialScheduleTrigger`** — trigger on first HTTP attempt (usually `initial`).

Inspect backend logs: both `traceId` and `attemptId` appear in
`[TV_STARTUP_BACKEND_TRACE]` lines when headers are sent.

Request headers:

- `X-TV-Startup-Trace-Id` — page navigation
- `X-TV-Schedule-Attempt-Id` — per HTTP schedule request

Cache bootstrap emits `session_cache_bootstrap` only — **not** counted in
`scheduleNetworkAttemptCount` and has **no** attempt id.

### Five-run cold validation (post-Phase A)

1. Set staging env: `NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1` and
   `NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1`; rebuild and deploy frontend.
2. Clear site data (Application → Clear storage) or use an incognito window.
3. Bypass service worker (DevTools → Application → Service Workers → Bypass).
4. Load `/tv` (global) five times (fresh navigation each time).
5. After each run: `copy(window.__TV_STARTUP_TRACE__.copyLatest())`.
6. Confirm every run: `scheduleNetworkAttemptCount === 1`,
   `scheduleCacheBootstrapCount === 0`, `scheduleRefreshCountDuringStartup === 0`,
   `scheduleAttemptIds.length === 1`.

### Warm SWR validation

1. Complete one successful `/tv` load (cache populated).
2. Navigate away and return to `/tv` **without** clearing storage.
3. Confirm: `scheduleCacheBootstrapCount === 1`, `scheduleNetworkAttemptCount === 1`,
   `scheduleAttemptIds.length === 1`.

### Rollback

Set `NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=0` (or unset), rebuild, redeploy.
Legacy duplicate-startup behavior returns immediately.

See `docs/tv-startup-phase-a-report.md` for full implementation details.

---

## 17. Phase B1 — schedule existence fast path (backend)

Phase B1 removes unnecessary `ensureTvSchedules()` work on the global schedule
read path when required half-day rows already exist.

```env
TV_SCHEDULE_EXISTENCE_FAST_PATH=1
```

Backend-only. Default `0`. Restart backend after change (no frontend rebuild).

### Expected backend trace (warm rows, flag on)

| Stage | Expected |
|-------|----------|
| `schedule_existence_probe` | `outcome: ready`, ~single-digit ms |
| `schedule_ensure_decision` | `reason: rows_already_ready` |
| `ensure_tv_schedules` | `invoked: false` |

When rows are missing: `required_window_missing` → `invoked: true`.

### Five-run post-B1 validation

1. Keep Phase A frontend flags enabled.
2. Set staging backend: `TV_SCHEDULE_EXISTENCE_FAST_PATH=1`,
   `TV_STARTUP_BACKEND_TRACE=1`; restart backend.
3. Load `/tv` five times **without** clearing storage.
4. Confirm backend logs show probe `ready` + ensure skipped each run.
5. Confirm frontend trace still shows one network attempt (Phase A unchanged).
6. Compare `ensure_tv_schedules` stage duration before/after — expect reduction
   on warm paths (typically hundreds of ms; not guaranteed).

### Rollback

Set `TV_SCHEDULE_EXISTENCE_FAST_PATH=0` and restart backend.

See `docs/tv-startup-phase-b1-report.md` for window definitions and lock analysis.

---

## 18. Phase C0 — startup playback guard (frontend)

Phase C0 bounds YouTube error recovery and suppresses pre-first-play drift seeks.

```env
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
```

Default `0`. Requires **frontend rebuild**. Independent of startup tracing.

### Staging validation configuration

```env
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
TV_SCHEDULE_EXISTENCE_FAST_PATH=0
TV_STARTUP_BACKEND_TRACE=1
```

### Five-run global cold procedure

1. Clear site data or use incognito; bypass service worker.
2. Load `/tv` five times (hard navigation / fresh cold start each time).
3. After each run: `copy(window.__TV_STARTUP_TRACE__.copyLatest())`.
4. Record per run:

| Field | Notes |
| ----- | ----- |
| `totalTtfvMs` | End-to-end TTFV |
| `stableTtfvMs` | T13 stable playback |
| `segments.T8_T11` | Player ready → first playing |
| `playerErrorCount` | YouTube errors (may be > 0) |
| `youtubeErrorCodeCounts` | Numeric codes when errors occur |
| `initialEmbedCount` | Initial iframe embeds |
| `loadVideoByIdCount` | ≤ initial + recovery cap + rollovers |
| `seekToCount` | Pre-first-play executed seeks should be **0** |
| `prePlaySeekSuppressedCount` | May be > 0 (expected) |
| `duplicateLoadSuppressedCount` | Duplicate load coalescing |
| `startupRecoveryCount` | ≤ 3 before first play |
| `startupRecoveryCapReached` | true only if cap hit |
| `scheduleNetworkAttemptCount` | Should remain 1 (Phase A) |
| `finalState` | `stable` or `failed` |

### Acceptance gate (five global cold runs)

- `scheduleNetworkAttemptCount === 1` (except proven legitimate refresh)
- Pre-first-play **executed** `seekToCount === 0`
- `startupRecoveryCount ≤ 3`; no unbounded load/error loop
- `youtubeErrorCodeCounts` populated when `playerErrorCount > 0`
- Median `T8_T11` improves ≥ 30% from ~11.49s baseline **or** < 8s
- No run `T8_T11` > 15s from repeated recovery
- Post-play live sync unchanged (manual spot-check)

### Community cold (two runs)

Same procedure on `/communities/<id>/tv` with community source selected.

### Warm + notice/enforcement smoke

1. One warm global reload (storage intact) — confirm Phase A schedule counts.
2. If safely available on staging: one notice/enforcement segment smoke — confirm
   segment semantics unchanged (notices pause, enforcement obeys existing path).

### Rollback

Set `NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=0`, rebuild frontend, redeploy.

See `docs/tv-startup-phase-c0-report.md` for error classification and recovery design.

---

## 19. Phase C1 — initial live-offset embed (frontend)

Phase C1 embeds the resolved live offset in the initial YouTube iframe
(`playerVars.start`) and avoids the post-ready `loadVideoById` on clean cold starts.

```env
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=1
```

Default `0`. Requires **frontend rebuild**. Independent from C0; **use with C0 enabled**
on staging for pre-play seek suppression.

### Staging validation configuration

Add to Phase C0 staging flags:

```env
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=1
```

### Clean-path summary expectations

| Field | Expected (clean cold regular-video) |
| ----- | ------------------------------------- |
| `initialEmbedCount` | 1 |
| `initialEmbedUsedResolvedTarget` | true |
| `initialReloadAvoided` | true |
| `loadVideoByIdCount` | 0 |
| Pre-first-play executed `seekToCount` | 0 |
| `initialEmbedStartOffsetSeconds` | > 0 (when live offset > 0) |

Record also: `T6_T8`, `T8_T11`, `initialEmbedTargetMatchedFirstSync`,
`initialEmbedGenerationCount`, `initialEmbedStaleReason`.

### Rollback

Set `NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=0`, rebuild frontend.

See `docs/tv-startup-phase-c1-report.md` for commit callback, remount policy, and T9 semantics.

---

## 20. Phase C1.1 — live-offset embed success confirmation

Phase C1.1 fixes a **confirmation wiring defect**: the functional C1 embed path
often bypassed `requestPlayback`, so `initialReloadAvoided` stayed false despite
zero `loadVideoById`. C1.1 adds once-only success recording on the same-index
sync path and a first-PLAYING fallback.

No change to `playerVars.start`, remount policy, schedule refresh behavior, or
Phase C0 seek suppression.

### Revised clean-path summary expectations

| Field | Expected (clean cold regular-video) |
| ----- | ------------------------------------- |
| `initialEmbedCount` | 1 |
| `initialEmbedUsedResolvedTarget` | true |
| `initialEmbedTargetConfirmed` | true |
| `initialReloadAvoided` | true |
| `loadVideoByIdCount` | 0 |
| Pre-first-play executed `seekToCount` | 0 |
| `initialEmbedSuccessTrigger` | one of `first_sync_*` or `first_playing_fallback` |
| `initialEmbedTargetMatchedFirstSync` | true if sync route; false if fallback-only |
| `firstBufferingRelativeToPlaying` | record for diagnostics (`before` or `after`) |

Also record: `T6_T8`, `T8_T11`, `scheduleRequestTriggers`,
`scheduleAttemptTriggerById`, `initialEmbedGenerationCount`, `initialEmbedStaleReason`.

### Five-run validation gate

On ≥5 cold global runs with C1 + C0 + trace enabled:

- All runs: `initialEmbedTargetConfirmed=true`, `initialReloadAvoided=true`, `loadVideoByIdCount=0`, `finalState=stable`
- At least one run may show `initialEmbedSuccessTrigger=first_playing_fallback` with `initialEmbedTargetMatchedFirstSync=false` (valid)
- No run with `initialEmbedStaleReason` set on clean path
- Median T8→T11 should remain improved vs Phase C0 baseline (~2.6s observed on first sanity run)

---

## 21. Phase C0.1 — stable-playback recovery guard (frontend)

Extends C0 error recovery and seek containment until **T13 stable playback**, not T11.

```env
NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=1
```

Default `0`. Requires **C0 playback guard enabled** and frontend rebuild.

### Summary expectations (with flag on)

| Field | Expected (successful cold run) |
| ----- | ------------------------------ |
| `startupStabilityGuardReleased` | true |
| `startupStabilityGuardReleaseReason` | `stable_playback` |
| `startupStabilityGuardReleasedAtMs` | present (recorded at release, before T13 finalize) |
| `finalState` | `stable` (T13 present) |
| `initialEmbedTargetConfirmed` | true (C1 path unchanged) |
| `initialReloadAvoided` | true (initial reload only; recovery loads may follow) |

**C0.1a sanity gate:** `startup_stability_guard_released` must appear in the event log
**before** the finalized `summary` event. Never accept `released=false` with a non-null
`startupStabilityGuardReleaseReason`. `postFinalizationEventCount` may be > 0 from normal
runtime activity after T13; release fields in the frozen summary must remain immutable.

Record: `postFirstPlayPreStableErrorCount`, `preStableSeekSuppressedCount`,
`preStableCorrectiveSeekCount`, `startupRecoveryCount`.

**Validation note:** keep the tab visible until T13; visibility-triggered schedule
refreshes are diagnostic only and invalidate cold baseline comparison.

See `docs/tv-startup-phase-c0-stability-report.md`.

---

## 22. Phase C2.0 — YouTube bootstrap trace decomposition (frontend)

Observational instrumentation decomposing **T6 → T8** into React lifecycle,
Resource Timing, API-object detection, iframe insertion, and long-task
subsegments. **No playback or loader behaviour changes.**

```env
NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=0
```

Default `0`. Requires **startup trace enabled** and frontend rebuild. Staging:

```env
NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=1
```

### T7 backward compatibility

T7 (`youtube_api_available`) remains the approximate canonical mark (§15).
C2.0 adds precise supplemental events (`youtube_api_object_detected`,
`youtube_api_resource_*`, etc.) without redefining T7.

### Key summary fields (when flag on)

| Field | Meaning |
| ----- | ------- |
| `T6_toPlayerCommitMs` | React commit delay after position resolved |
| `playerCommitToApiResourceStartMs` | Delay until iframe_api network start |
| `apiResourceStartToFinishMs` | iframe_api download/parse window |
| `playerCommitToIframeInsertedMs` | DOM iframe appearance after commit |
| `iframeInsertedToT8Ms` | YouTube init after iframe |
| `youtubeApiPresentAtPlayerCommit` | Same-document API reuse indicator |
| `longTaskCountT6ToT8` | Main-thread long tasks overlapping T6–T8 |

Full event list, segment formulas, validation runs, and rollback:
`docs/tv-startup-phase-c2-bootstrap-trace.md`.

---

## 23. Phase C2.1 — SSR YouTube connection hints (frontend)

Controlled optimization: TV-route server-rendered `preconnect` + `dns-prefetch`
for `www.youtube.com` and `www.youtube-nocookie.com`. **Connection timing only**
— no script preload, no player changes.

```env
NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT=0
```

Default `0`. Independent from C2.0 tracing. Staging experiment:

```env
NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT=1
```

Verify via **View Source** on `/tv`: exactly one preconnect per required origin.
When enabled, client `TvYoutubePreconnect` skips duplicate origins.

C2.0 summary fields for validation: `youtubeApiDnsDurationMs`,
`youtubeApiConnectDurationMs`, `ssrYoutubePreconnectEnabled`.

Full evidence, acceptance, and rollback: `docs/tv-startup-phase-c2-ssr-preconnect.md`.

---

## 24. Phase C2.2 — Early YouTube IFrame API warm-up (frontend)

Controlled experiment: begin `iframe_api` acquisition at TVProvider T2, overlapping the
schedule request. **Script acquisition only** — no iframe, no player, no playback.

```env
NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP=0
```

Default `0`. Independent from C2.0/C2.1. Staging experiment:

```env
NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP=1
```

One **absolute 8,000 ms deadline** from T2 warm-up request. TvPlayer shell mounts normally;
only `<YouTube>` child rendering may defer until warm-up resolves or deadline.

C2.2 summary fields: `earlyYoutubeApiWarmupOutcome`, `youtubeApiWarmupResolvedBeforeT6`,
`youtubeApiWarmupLeadBeforePlayerCommitMs`, `youtubeChildMountDeferredForWarmup`,
`apiResourceStartedBeforePlayerCommit`.

**Privacy:** YouTube is contacted earlier than before (iframe_api at T2). Document for privacy review.

Full evidence, acceptance, and rollback: `docs/tv-startup-phase-c2-api-warmup.md`.
