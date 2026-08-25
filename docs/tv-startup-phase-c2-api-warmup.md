# TV Startup — Phase C2.2 Early YouTube IFrame API Warm-Up

Phase C2.2 begins acquisition of `https://www.youtube.com/iframe_api` at **TVProvider T2**
(`tv_provider_mounted`), overlapping the existing schedule request. It does **not** create an
iframe, `YT.Player`, or playback session.

## Feature flag

```env
NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP=0   # default off
```

Active only when `1` or `true`. TV-route scoped. Independent from C2.0 and C2.1. Requires a
frontend rebuild. Rollback: set flag to `0` and redeploy.

## Staging validation stack

Use alongside the accepted correctness stack (C2.1 remains off):

```env
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=1
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=0
NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=1
NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT=0
NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP=1
```

Backend (unchanged):

```env
TV_SCHEDULE_EXISTENCE_FAST_PATH=0
TV_STARTUP_BACKEND_TRACE=1
```

## T2 trigger

After the canonical `tv_provider_mounted` trace event, TVProvider calls (fire-and-forget):

```typescript
requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
```

- Does **not** await before `loadSchedule`
- Once per document (module guard)
- Source switches within the same document do not re-trigger
- Hard navigation may start a new document-scoped warm-up
- Never invoked during SSR

### Eligibility

There is **no synchronous access/redirect gate at T2** that would require skipping warm-up for
some visitors. Every mounted TVProvider on the TV route is eligible. Async SideChick redirects
and backend schedule filtering remain unchanged — warm-up does not bypass notices or enforcement.

## Absolute deadline

One authoritative deadline: **8,000 ms from the T2 warm-up request** (`performance.now()`).

- Not a separate timeout when TvPlayer mounts
- TvPlayer child gate uses **remaining time** until this deadline only
- On timeout/failure: release child gate; legacy react-youtube path proceeds
- No automatic retry during the document lifecycle
- Schedule, TVProvider, looper, and TvPlayer **shell** never wait for warm-up

## Loader (`youtube-iframe-api-loader.ts`)

Document-scoped states: `idle` → `loading` → `ready` | `failed`.

| Path | Behaviour |
| ---- | --------- |
| `window.YT?.Player` exists | Immediate resolve; outcome `reused_existing_object` |
| Existing `script[src]` matching iframe_api (head or body) | Reuse; attach handlers; outcome `reused_existing_script` |
| No API, no script | Insert one canonical script (`#youtube-iframe-api`); outcome `script_inserted` |

### Callback chaining

`window.onYouTubeIframeAPIReady` is chained — prior handler runs first (errors swallowed), then
loader settles once when `YT.Player` is present.

### Failure recovery

If the loader inserted a script that fails or times out, it may remove **only its own** script
and reset ownership so the normal player path can recover. Scripts owned by other loaders are
never removed.

## TvPlayer child-only coordination

When flag is on and API is not ready:

- TvPlayer shell/container mounts normally (`tv_player_committed`, `react_youtube_container_committed`)
- `<YouTube>` child is deferred until warm-up resolves or absolute deadline
- On failure/timeout: immediate fallback to legacy `<YouTube>` render

## Duplicate-script prevention

Successful path: T2 warm-up inserts/reuses iframe_api → API ready → TvPlayer renders
react-youtube → youtube-player sees `YT.Player` → no second API script.

If warm-up times out and legacy path inserts another script, summary records
`warmup_fallback_duplicate_api_resource` when `youtubeApiResourceCount > 1`.

## Trace events

| Event | When |
| ----- | ---- |
| `youtube_api_warmup_requested` | T2 fire-and-forget |
| `youtube_api_warmup_reused_existing_object` | API already present |
| `youtube_api_warmup_reused_existing_script` | Existing script detected |
| `youtube_api_warmup_script_inserted` | Loader inserted script |
| `youtube_api_warmup_resolved` | Warm-up succeeded |
| `youtube_api_warmup_failed` | Script/load failure |
| `youtube_api_warmup_timed_out` | Absolute deadline reached |
| `youtube_child_mount_deferred` | `<YouTube>` deferred |
| `youtube_child_mount_released` | Child released (success) |
| `youtube_child_mount_fallback` | Child released (fallback) |

Safe fields only: `startupGeneration`, `trigger`, `outcome`, `elapsedMs`, `remainingDeadlineMs`,
`fallbackReason`. No complete URLs, video IDs, or query strings.

## Summary fields

`earlyYoutubeApiWarmupEnabled`, `earlyYoutubeApiWarmupTrigger`, `earlyYoutubeApiWarmupRequestedAtMs`,
`earlyYoutubeApiWarmupResolvedAtMs`, `earlyYoutubeApiWarmupDurationMs`, `earlyYoutubeApiWarmupOutcome`,
`youtubeApiPresentAtT6`, `youtubeApiWarmupResolvedBeforeT6`, `youtubeApiWarmupLeadBeforePlayerCommitMs`,
`youtubeChildMountDeferredForWarmup`, `youtubeChildMountDeferredAtMs`, `youtubeChildMountReleasedAtMs`,
`youtubeChildMountDeferredDurationMs`, `youtubeChildMountFallbackReason`,
`youtubeApiPresentAtReactYoutubeMount`, `apiResourceStartedBeforePlayerCommit`.

Outcomes: `disabled`, `reused_existing_object`, `reused_existing_script`, `resolved_by_warmup`,
`timed_out_player_fallback`, `failed_player_fallback`.

## C2.0 preservation

T6, T7, T8 canonical marks unchanged. `playerCommitToApiResourceStartMs` remains nullable when the
resource begins before player commit; `apiResourceStartedBeforePlayerCommit: true` explains why.

## Privacy review notes

When enabled, the browser contacts `https://www.youtube.com/iframe_api` **earlier** than before
(at T2 instead of at player mount). This is script acquisition only — no iframe, no video ID, no
playback, no intentional `youtube-nocookie.com` or `googlevideo.com` contact from warm-up.

## Validation

### One-run sanity (warm-up on)

1. Deploy with flag `1` and full staging stack above.
2. Hard-navigate to `/tv` with DevTools Network filtered to `iframe_api`.
3. Confirm `youtube_api_warmup_requested` at T2 before schedule response.
4. Confirm at most one iframe_api script; `youtubeApiResourceCount <= 1` on success.
5. Confirm playback reaches T13; no schedule regression.

### Five-run warm-up-on

Repeat hard navigation five times. Record `earlyYoutubeApiWarmupOutcome`, `earlyYoutubeApiWarmupDurationMs`,
`youtubeApiWarmupResolvedBeforeT6`, `youtubeApiWarmupLeadBeforePlayerCommitMs`, and T6→T8 segments.

### Same-deployment warm-up-off control

Set `NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP=0` (rebuild). Five runs — no warm-up events, legacy
player behaviour, baseline T6→T8.

### Error-150 smoke

One run with warm-up on; confirm no new error-150 regressions vs control.

## Rollback

```env
NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP=0
```

Rebuild and redeploy. No loader state persists across hard navigation.

## Scope confirmation

In scope: T2 warm-up, hardened loader, child-only TvPlayer gate, C2.2 trace/summary.

Out of scope: SSR preconnect (C2.1), API preload in HTML, service-worker changes, player-variable
changes, C1 schedule changes.
