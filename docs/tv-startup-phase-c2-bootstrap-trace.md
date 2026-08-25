# TV Startup — Phase C2.0 YouTube Bootstrap Trace Decomposition

Phase C2.0 adds **observational instrumentation only** to decompose the highly
variable **T6 → T8** window (initial playback position resolved → YouTube player
ready). It does **not** change HTML head hints, script loading, react-youtube,
service-worker behaviour, autoplay, schedule fetching, guards, or any playback
timing.

## Feature flag

```env
NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=0   # default off
```

Active only when **both** are enabled:

```env
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=1
```

(`1` or `true` only.) Requires a frontend rebuild.

When disabled: no Resource Timing observer, no long-task observer, no
MutationObserver, no supplemental events, no extra summary fields beyond null
defaults.

## Staging validation stack

Use alongside the accepted correctness stack:

```env
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=1
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=0
NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=1
```

Backend (unchanged):

```env
TV_SCHEDULE_EXISTENCE_FAST_PATH=0
TV_STARTUP_BACKEND_TRACE=1
```

## Canonical marks (unchanged)

| Mark | Event | Notes |
| ---- | ----- | ----- |
| T6 | `initial_playback_position_resolved` | Unchanged |
| T7 | `youtube_api_available` | **Preserved for backward compatibility** — still approximate |
| T8 | `player_ready` | Unchanged |

C2.0 adds **supplemental events**; it does not redefine T6/T7/T8 semantics.

## Supplemental events

### React lifecycle

| Event | When | Key fields |
| ----- | ---- | ---------- |
| `tv_looper_committed` | Mount-only `useLayoutEffect` in active looper | `looperKind`, `source`, `startupGeneration` |
| `tv_player_render_requested` | Immediately before active `TvPlayer` render (once per generation) | `startupGeneration`, `source`, `selectedIndex`, `hasPlaybackUrl` |
| `tv_player_committed` | Mount-only `useLayoutEffect` in `TvPlayer` | `youtubeApiPresentAtCommit`, `youtubePlayerConstructorPresentAtCommit` |
| `react_youtube_container_committed` | DOM container for react-youtube available | `startupGeneration`, `source` |
| `youtube_player_creation_requested` | Immediately after container commit | Request boundary only — **not** proof of `new YT.Player()` |

### Resource Timing (derived)

| Event | Source |
| ----- | ------ |
| `youtube_api_resource_started` / `_finished` | `iframe_api` path on YouTube hosts |
| `youtube_widget_resource_started` / `_finished` | `widget_api` |
| `youtube_embed_document_started` / `_finished` | `/embed/` documents |

Timestamps use the resource entry's `startTime` / `responseEnd`, not observer
callback time. First event wins per category; duplicate counts are recorded
separately.

### API object

| Event | When |
| ----- | ---- |
| `youtube_api_object_detected` | First reliable `window.YT.Player` observation |

`detectionReason`:

- `present_at_player_commit` — API already on page (same-document reuse)
- `present_at_mount_effect` — present at mount effect (legacy T7 path)
- `poll_detected` — bounded 200ms poll (diagnostic only)
- `ready_callback_without_prior_detection` — T8 arrived before poll detected object

### Iframe

| Event | When |
| ----- | ---- |
| `youtube_iframe_inserted` | First iframe descendant in player container |
| `duplicate_iframe_insertion` | Additional iframe insertions (diagnostic) |

No iframe `src`, video ID, or attributes are logged.

## Summary subsegments (nullable)

All measured in ms relative to canonical marks / lifecycle timestamps:

| Field | Formula |
| ----- | ------- |
| `T6_toLooperCommitMs` | T6 → looper commit |
| `T6_toPlayerRenderRequestedMs` | T6 → player render requested |
| `T6_toPlayerCommitMs` | T6 → player commit |
| `playerCommitToApiResourceStartMs` | player commit → first iframe_api start |
| `apiResourceStartToFinishMs` | iframe_api start → finish |
| `apiResourceFinishToObjectDetectedMs` | iframe_api finish → API object detected |
| `playerCommitToApiObjectDetectedMs` | player commit → API object |
| `playerCommitToIframeInsertedMs` | player commit → iframe inserted |
| `apiObjectDetectedToIframeInsertedMs` | API object → iframe |
| `iframeInsertedToT8Ms` | iframe → T8 |
| `playerCommitToT8Ms` | player commit → T8 |

Additional counters: `youtubeApiResourceCount`, `youtubeWidgetResourceCount`,
`youtubeEmbedDocumentCount`, `youtubeIframeInsertionCount`,
`youtubeDuplicateIframeInsertionCount`, `looperCommitCount`, `tvPlayerCommitCount`,
`looperKind`, long-task aggregates (`longTaskCountT2ToT8`, etc.).

### Phase C2.1 connection-timing fields (when C2.0 trace on)

From the first `iframe_api` Resource Timing entry:

- `youtubeApiDnsDurationMs`, `youtubeApiConnectDurationMs`, `youtubeApiTlsDurationMs`
- `youtubeApiRequestWaitDurationMs`, `youtubeApiResponseDurationMs`
- `youtubeApiConnectionReusedOrPreconnected`

Always in summary: `ssrYoutubePreconnectEnabled`, `ssrYoutubePreconnectOrigins`
(reflects C2.1 flag, independent of trace decomposition).

See `docs/tv-startup-phase-c2-ssr-preconnect.md`.

## Resource Timing limitations

- Cross-origin entries may report zero `responseStart` / `responseEnd` /
  `transferSize` due to `Timing-Allow-Origin`. These are classified as
  `timingDetailLevel: "limited"` — zero values are preserved, not treated as
  instant downloads.
- Cache inference (`likely_memory_or_http_cache` vs `network_or_unknown`) is
  best-effort when timing detail is available (`transferSize: 0` and
  `encodedBodySize > 0`).
- No full URLs, query strings, video IDs, or tokens are stored.

## Cache / same-document semantics

| Scenario | Expected |
| -------- | -------- |
| Fresh document, API absent | `youtubeApiPresentAtPlayerCommit: false`, iframe_api resource events likely |
| Same-document source switch | `youtubeApiPresentAtPlayerCommit: true`, `api_object_detected_before_resource_start` **not** flagged as error |
| Hard navigation + HTTP cache | API object usually absent; Resource Timing may show cache inference |

`scheduleCacheBootstrapCount: 1` indicates schedule cache reuse — **not** YouTube
API object reuse.

## Observer lifecycle

1. Initialized once per startup trace run (`initYoutubeBootstrapTrace`).
2. Resource + long-task observers start at trace init (no later than T2 for
   long-task coverage once T2 is recorded).
3. Iframe `MutationObserver` attaches only to the active player container when
   `TvPlayer` commits.
4. Stopped/disconnected at T8 or trace finalization.
5. Events from stale trace IDs or older `startupGeneration` are rejected.
6. Summary fields are immutable after finalization.

## Privacy

Resource entries store only host/path **categories**, timing numbers, sizes, and
cache inference — never complete URLs or video identity.

## Validation procedure

### Five-run global cold

1. Enable staging flags above; rebuild frontend.
2. DevTools → Disable cache; clear site data; bypass service worker.
3. Hard-navigate to `/tv?tvDebug=1` five times (fresh tab or clear between runs).
4. Export summary via `window.__TIPMANNA_TV_STARTUP_TRACE__.copyLatest()`.
5. Record per run: all C2.0 subsegments, resource counts, long-task aggregates,
   ordering diagnostics.

### Five-run same-document source switch

1. Load `/tv` (global) until T8+.
2. Switch to community source **without** full page reload (in-app navigation).
3. Repeat five times; expect `youtubeApiPresentAtPlayerCommit: true`, short
   T6→T8, no `api_resource_start_missing` diagnostic.

## Rollback

Set `NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=0` (or remove) and rebuild. No code
path changes when off. Prior Phase A/C0/C0.1 behaviour is unchanged.

## Out of scope (C2.1+)

C2.0 explicitly does **not** implement SSR preconnect, script preload, API
preloading, singleton loader changes, or service-worker changes. **Phase C2.1**
implements SSR connection hints only — see `docs/tv-startup-phase-c2-ssr-preconnect.md`.

**Phase C2.2** implements controlled early iframe_api warm-up at T2 — see
`docs/tv-startup-phase-c2-api-warmup.md`. C2.2 adds `apiResourceStartedBeforePlayerCommit`
to explain null `playerCommitToApiResourceStartMs` when the API resource begins before
player commit.

See also: `docs/tv-startup-latency-measurement-protocol.md` §22–§24.
