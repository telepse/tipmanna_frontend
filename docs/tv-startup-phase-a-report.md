# TV Startup Phase A — Implementation Report

Phase A fixes duplicate initial schedule network requests on cold `/tv` navigation.
It does **not** implement Phase B (backend query optimization), Phase C (player
`playerVars.start`), or Phase D (overlay/TTFV semantics).

---

## Root cause fixed

On cold global TV navigation, startup performed **2–4 schedule network attempts**
because:

1. The `[scheduleSourceCommunityId]` effect reset playback and called
   `loadSchedule({ trigger: "source_change" })` on **every mount**, including the
   initial source value.
2. A separate `useEffect([loadSchedule])` also called
   `loadSchedule({ trigger: "initial" })` on mount (coalesced if concurrent).
3. After the first response, `loadSchedule` callback identity changed
   (`[applySchedulePayload, syncToLive]` deps) → the mount effect **re-ran** →
   a second sequential network fetch.
4. With SWR enabled, the first fetch wrote sessionStorage; the second pass read
   it → `scheduleCacheBootstrapCount: 1` even on cleared site data.
5. Visibility / source-change refresh counters could increment during startup.

---

## Old startup request sequence

```
Mount TVProvider
  → scheduleSourceCommunityId effect: reset + loadSchedule(source_change)  [network #1, coalesced]
  → loadSchedule effect [loadSchedule dep]: loadSchedule(initial)         [coalesced with #1]
  → loadSchedule identity changes (syncToLive deps)
  → loadSchedule effect re-runs: loadSchedule(initial)                      [network #2]
  → SWR reads sessionStorage written by #1                                  [cache bootstrap #1]
  → optional visibility refresh during startup                              [refresh #1]
```

---

## New startup request sequence (Phase A flag enabled)

```
Mount TVProvider
  → snapshot pre-navigation sessionStorage schedule keys
  → mount-once effect (empty deps, loadScheduleRef): loadSchedule(initial)  [network #1 only]
  → scheduleSourceCommunityId effect: skip initial_establishment (no reset/refetch)
  → loadSchedule callback identity changes: mount-once effect does NOT re-run
  → SWR bootstrap only if cache key existed before this navigation
  → visibility suppressed until initial startup completes (unless hidden→visible after)
```

Genuine post-mount source change (global ↔ community):

```
scheduleSourceCommunityId changes to new value
  → resetPlaybackForScheduleSourceChange
  → loadSchedule(source_change)                                             [one new network request]
```

Same source re-set: **no request**.

---

## Files modified

| File | Change |
|------|--------|
| `frontend/src/lib/tv-feature-flags.ts` | `isTvSingleStartupScheduleEnabled()` |
| `frontend/src/lib/tv-single-startup-schedule.ts` | **New** — testable Phase A semantics |
| `frontend/src/components/tv-provider.tsx` | Single startup owner, SWR bootstrap guard, visibility guard, attempt IDs |
| `frontend/src/lib/tv-startup-trace.ts` | Attempt correlation summary fields |
| `frontend/src/lib/tv-schedule-client-fetch.ts` | `X-TV-Schedule-Attempt-Id` header |
| `frontend/src/actions/tv-schedule.ts` | Forward attempt header |
| `backend/src/utils/tv-startup-backend-trace.util.ts` | Sanitize/log attempt id |
| `frontend/.env` | Document `NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE` |
| `docs/tv-startup-latency-measurement-protocol.md` | Phase A validation section |
| Test files | See below |

---

## Tests added

| File | Coverage |
|------|----------|
| `frontend/src/lib/__tests__/tv-single-startup-schedule.spec.ts` | Cold/warm SWR, source change, visibility, feature flag |
| `frontend/src/lib/__tests__/tv-schedule-client-fetch.spec.ts` | Direct-fetch correlation headers |
| `frontend/src/lib/__tests__/tv-startup-trace.spec.ts` | Attempt id summary fields |
| `backend/src/utils/__tests__/tv-startup-backend-trace.util.spec.ts` | Attempt id sanitization/logging |

Existing suites preserved: coalescing, orchestration, startup trace, backend trace.

---

## Behavior preserved

- Schedule semantics, live-position calculations, ordering
- Global and community TV behavior
- SWR warm-start (pre-nav cache + one network revalidation)
- Pusher, interval, boundary, sync_miss refresh
- Visibility refresh **after** startup finalization
- ETag/304, retry delays, access/safety filtering, enforcement
- Autoplay and player behavior (no `playerVars.start`, `loadVideoById`, `syncToLive`, overlay changes)

---

## Feature flag

```
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=0   # default — legacy startup path
NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1   # Phase A single startup path
```

Requires **frontend rebuild**. Roll back by unsetting or setting to `0` and redeploying.

---

## SWR behavior

| Scenario | Before Phase A | After Phase A (flag on) |
|----------|----------------|-------------------------|
| Cold (no cache) | 0–1 bootstrap from same-nav write | `scheduleCacheBootstrapCount: 0` |
| Warm (pre-nav cache) | Bootstrap + revalidation | Bootstrap once + one revalidation |
| Same-nav cache write | Could bootstrap on 2nd load | Never bootstraps from same-nav write |

`scheduleSwrBootstrappedRef` becomes `true` when the SWR bootstrap **phase** completes:
either after applying pre-navigation cache, or when cold path confirms no pre-nav cache
(no second bootstrap pass).

---

## Visibility behavior

| Scenario | Before | After (flag on) |
|----------|--------|-----------------|
| Initial visible tab | Could refresh during startup | Suppressed |
| Hidden → visible during in-flight initial | Could duplicate request | Suppressed |
| Hidden → visible after startup | Refreshes | Unchanged |

---

## Attempt correlation design

| Id | Scope | Header |
|----|-------|--------|
| `startupTraceId` | One per page navigation | `X-TV-Startup-Trace-Id` |
| `scheduleAttemptId` | One per real HTTP schedule request | `X-TV-Schedule-Attempt-Id` |
| `attemptNumber` | Monotonic within startup trace | In trace events only |

Cache-only bootstrap generates **no** attempt id.

---

## Known limitations

- React Strict Mode double-mount in dev may still produce duplicate effects (dev-only).
- Late source establishment from `TvSourcePickerProvider` with a **different** resolved
  source still triggers one genuine `source_change` load (by design).
- Phase B–D optimizations not included; cold startup may still exceed one request if
  retries, stale-source reload, or user-initiated refresh occur during startup window.

---

## Phase B, C, D

**Not implemented** in this task.
