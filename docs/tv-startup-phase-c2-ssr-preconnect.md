# TV Startup — Phase C2.1 SSR YouTube Connection Hints

Phase C2.1 is a **single controlled optimization**: emit YouTube connection hints in
the **initial server-rendered HTML** for the `/tv` route so DNS, TCP, and TLS can
overlap HTML download, hydration, and schedule acquisition.

It does **not** preload `iframe_api`, preload embed documents, inject scripts early,
change react-youtube, or alter player behavior.

## C2.0 evidence (why this experiment)

Cold global runs with C2.0 tracing showed:

| Subsegment                    | Median                          |
| ----------------------------- | ------------------------------- |
| T6 → player commit            | ~57 ms                          |
| Player commit → T8            | ~11.06 s                        |
| iframe_api resource duration  | ~1.29 s                         |
| API response → object         | ~0.48 s                         |
| Player commit → iframe insert | ~3.29 s                         |
| **Iframe insert → T8**        | **~7.61 s (~69% of commit→T8)** |
| Long-task duration T6→T8      | ~153 ms                         |

**Ruled out as primary causes:** React commit delay (~57 ms), duplicate players
(`looperCommitCount` / `tvPlayerCommitCount` = 1), main-thread blocking (~153 ms
long tasks vs multi-second gaps).

**First experiment:** overlap connection setup via SSR `<link rel="preconnect">`
and `dns-prefetch` — smallest change with measurable Resource Timing impact on
`iframe_api` connect/DNS fields.

## Feature flag

```env
NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT=0   # default off
```

(`1` or `true` only.) Requires frontend rebuild. Independent from C2.0 tracing.

## Origins hinted (TV route only)

| Origin                             | Link type    | crossOrigin |
| ---------------------------------- | ------------ | ----------- |
| `https://www.youtube-nocookie.com` | preconnect   | `anonymous` |
| `https://www.youtube.com`          | preconnect   | (none)      |
| `//www.youtube-nocookie.com`       | dns-prefetch | —           |
| `//www.youtube.com`                | dns-prefetch | —           |

**Not included:** `i.ytimg.com` (SSR), `googlevideo.com` (dynamic post-T8).

Client `TvYoutubePreconnect` still preconnects `i.ytimg.com` after hydration.

## Implementation

- **Server:** `TvYoutubeSsrPreconnect` in `app/(tv)/layout.tsx` (Server Component).
  Link tags are hoisted to `<head>` by the App Router — no hydration wait.
- **Client dedup:** When SSR flag is on, `TvYoutubePreconnect` skips
  `www.youtube.com` and `www.youtube-nocookie.com` preconnect/DNS (exactly one
  effective hint set).
- **Explore hints:** Root `app/layout.tsx` Explore preload (`NEXT_PUBLIC_EXPLORE_YT_PRELOAD`)
  is unchanged and unrelated.

## C2.0 diagnostic additions

When bootstrap trace is enabled, summary may include (from first `iframe_api`
Resource Timing entry):

- `youtubeApiDnsDurationMs`
- `youtubeApiConnectDurationMs`
- `youtubeApiTlsDurationMs`
- `youtubeApiRequestWaitDurationMs`
- `youtubeApiResponseDurationMs`
- `youtubeApiConnectionReusedOrPreconnected`

Also always (in finalized summary):

- `ssrYoutubePreconnectEnabled`
- `ssrYoutubePreconnectOrigins` (safe category strings)

Null when cross-origin timing is unavailable — zero values are not treated as proof
of preconnect unless full timing supports reuse inference.

## Staging validation stack

```env
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1
NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1
NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1
NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD=1
NEXT_PUBLIC_TV_INITIAL_LIVE_OFFSET_EMBED=0
NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=1
NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT=1
```

## One-run sanity procedure

1. Rebuild and deploy with C2.1 flag on.
2. View page source on `/tv` (not DevTools Elements after hydration).
3. Confirm exactly one `preconnect` each for `www.youtube.com` and
   `www.youtube-nocookie.com` (nocookie has `crossorigin="anonymous"`).
4. Confirm no `iframe_api` or `/embed/` in `<head>`.
5. Run one cold load; export trace — `ssrYoutubePreconnectEnabled: true`.

## Five-run validation procedure

1. Five global cold runs (clear storage, SW bypassed, disable cache).
2. Compare vs C2.0 baseline: `youtubeApiDnsDurationMs`, `youtubeApiConnectDurationMs`,
   `playerCommitToApiResourceStartMs`, `iframeInsertedToT8Ms`, `playerCommitToT8Ms`.
3. Five same-document source switches — confirm no duplicate preconnect regressions.
4. Verify `youtubeApiConnectionReusedOrPreconnected: true` on some runs when timing
   allows (optional — browser-dependent).

## Acceptance criteria

- Median `playerCommitToT8Ms` or `iframeInsertedToT8Ms` improves vs C2.0 baseline
  without increasing duplicate players, recovery count, or failed startups.
- `youtubeApiConnectDurationMs` or DNS duration decreases on runs with full timing.
- No duplicate `preconnect` for the same origin (count = 1 each).
- No change to player ready/play timing semantics (T8/T11 marks still valid).

## Rollback

Set `NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT=0` and rebuild. Client fallback
preconnect restores legacy behavior.

## Out of scope

Early API loading, API loader unification, service-worker changes, googlevideo
preconnect, script preload.

See also: `docs/tv-startup-phase-c2-bootstrap-trace.md`, measurement protocol §23.
