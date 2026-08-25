# TV Startup Phase B1 — Schedule Existence Fast Path

Phase B1 adds a lightweight read-only existence probe before the legacy
`ensureTvSchedules()` path on global `GET /api/v1/tv/schedule`.

**Not implemented in this phase:** playlist-query slimming, access-map caching,
community fast path, player/overlay changes, Phase B2/C/D.

---

## Previous behavior

Every `tvSchedule` request unconditionally called:

```
ensureTvSchedules()
  → withCronLock("tv-schedule:global", …, generateSchedule)
  → ensureTvDailyWindowsRange(w … w+2)  // may no-op on warm rows
```

Even when all required half-day rows were already materialized, the HTTP path still
paid distributed-lock acquisition and entered `generateSchedule()`.

---

## New behavior (flag enabled)

```
tvSchedule entry
  → schedule_existence_probe (lightweight _count queries)
  → schedule_ensure_decision
  → if ready: skip ensureTvSchedules()
  → if missing / probe error / indeterminate: legacy ensureTvSchedules()
  → existing load/composition/filtering unchanged
```

Conditional ensure calls at lines B (`!alternatePlaylist`) and C (`REBUILDING`) in
`schedule.controller.ts` are unchanged.

---

## Required schedule-window definition

Windows are **epoch-relative** (same as `generateSchedule()`):

1. Read `tvGlobalSettings.broadcastEpoch` (fallback `Date.now()` on first use).
2. `w = tvWindowIndex(epochMs, nowMs)`.
3. Required materialized rows at:
   - **current** — `windowStartForIndex(epochMs, w)`
   - **next** — `windowStartForIndex(epochMs, w + 1)`
   - **following** — `windowStartForIndex(epochMs, w + 2)`

**Ready criteria** (matches warm-path in `ensureTvDailyWindowsRange`):

- Row exists **and** `_count.items > 0`
- Zero-item row → **missing** (orphan; legacy path deletes and regenerates)
- No DB `REBUILDING` state — that is computed at serve time via safety filters

**Community TV** uses a separate stack (`ensureCommunityTvSchedules`) — out of
scope for B1; global `/tv/schedule` only.

---

## Probe query shape

Per window, reuses existing `probeScheduleWindow(windowStart)`:

```sql
-- Prisma equivalent
tvDailySchedule.findUnique({
  where: { windowStart },
  select: { id: true, _count: { select: { items: true } } },
})
```

Three parallel probes (current, next, following). No `include: { items }`, channels,
events, or composed client rows.

---

## Feature flag

```env
TV_SCHEDULE_EXISTENCE_FAST_PATH=0   # default — legacy unconditional ensure
TV_SCHEDULE_EXISTENCE_FAST_PATH=1   # probe-first fast path
```

Backend-only. No frontend rebuild required. Restart backend after change.

---

## Ready / missing / error decision table

| Condition | Probe outcome | ensureTvSchedules() | Decision reason |
|-----------|---------------|---------------------|-----------------|
| Flag off | (skipped) | **Invoked** | `legacy_flag_disabled` |
| All 3 windows materialized | `ready` | **Skipped** | `rows_already_ready` |
| Any window missing/empty | `missing` | **Invoked** | `required_window_missing` |
| Probe returns indeterminate | `indeterminate` | **Invoked** | `probe_indeterminate_fallback` |
| Probe throws | `error` | **Invoked** | `probe_error_fallback` |

---

## Lock / race analysis

`ensureTvSchedules()` uses **non-blocking** `withCronLock` / `pg_try_advisory_lock`.
Lock losers return without throwing (pre-existing behavior).

**Pre-existing race (unchanged by B1):**

1. Request A probe → missing → calls ensure → loses lock → returns silently
2. Request A continues schedule load — may see partial/missing rows
3. Calls B/C in controller may invoke ensure again

**B1 does not introduce new races:** when probe reports `ready`, we skip ensure
because `generateSchedule()` would have been a no-op on all three windows anyway.
When probe reports `missing`, behavior matches legacy unconditional ensure.

No polling, blocking waits, or async generation queues added.

---

## Trace and Server-Timing additions

New stages (when startup tracing enabled):

| Stage | Fields |
|-------|--------|
| `schedule_existence_probe` | `outcome`, `probeMs`, `currentExists`, `nextExists`, `followingExists`, `missingWindows`, `fastPathEnabled` |
| `schedule_ensure_decision` | `reason`, `fastPathEnabled`, `missingWindows` |
| `ensure_tv_schedules` | `invoked` (true/false), `reason` |

Existing correlation preserved: `traceId`, `attemptId` on all log lines.

---

## Files modified

| File | Change |
|------|--------|
| `backend/src/configs/runtime-flags.config.ts` | `TV_SCHEDULE_EXISTENCE_FAST_PATH` |
| `backend/src/services/tv-schedule-existence-probe.service.ts` | **New** — probe logic |
| `backend/src/services/tv-schedule-ensure.service.ts` | **New** — ensure + fast-path decision |
| `backend/src/controllers/schedule.controller.ts` | Entry uses `ensureTvSchedulesForRead` |
| Test files | existence probe + ensure service specs |
| `docs/tv-startup-latency-measurement-protocol.md` | Phase B1 section |
| `docs/tv-startup-phase-b1-report.md` | This document |

---

## Tests added

| File | Coverage |
|------|----------|
| `tv-schedule-existence-probe.service.spec.ts` | Window math, ready/missing, zero-item, no heavy reads |
| `tv-schedule-ensure.service.spec.ts` | Flag off/on, missing variants, probe error/indeterminate, trace correlation |

---

## Expected timing effect

When rows are already materialized (normal warm staging/production):

- **Removed:** distributed-lock acquire + `generateSchedule()` entry overhead
- **Added:** ~3 lightweight `_count` probes (typically single-digit ms each)
- **Net expected improvement on `ensure_tv_schedules` stage:** approximately **200–800 ms** typical, up to **~4 s** on observed slow ensure paths — **not guaranteed**; measure via backend trace

Remaining latency after B1: `playlist_loaded`, `access_safety_resolved`, player path (Phase B2+).

---

## Deployment

1. Deploy backend with `TV_SCHEDULE_EXISTENCE_FAST_PATH=0` (safe default).
2. Enable on staging: `TV_SCHEDULE_EXISTENCE_FAST_PATH=1`.
3. Restart backend process.
4. Run validation (below).
5. Enable production after acceptance.

## Rollback

Set `TV_SCHEDULE_EXISTENCE_FAST_PATH=0` (or unset) and restart backend.
Legacy unconditional ensure returns immediately.

---

## Staging validation (five-run)

Prerequisites: Phase A flags still enabled on frontend.

1. Set backend staging: `TV_SCHEDULE_EXISTENCE_FAST_PATH=1`, `TV_STARTUP_BACKEND_TRACE=1`.
2. Restart backend.
3. Load `/tv` five times without clearing storage (warm rows).
4. In backend logs, confirm per request:
   - `schedule_existence_probe` with `outcome: ready`
   - `schedule_ensure_decision` with `reason: rows_already_ready`
   - `ensure_tv_schedules` with `invoked: false`
5. Frontend trace: still `scheduleNetworkAttemptCount === 1` (Phase A unchanged).

## Missing-window validation

1. In a test DB, delete the `following` half-day row for the current window index.
2. Request `/api/v1/tv/schedule` with trace headers.
3. Confirm:
   - probe `outcome: missing`, `missingWindows` includes `following`
   - `ensure_tv_schedules` `invoked: true`, `reason: required_window_missing`
4. Automated coverage: `tv-schedule-ensure.service.spec.ts` missing-window cases.

---

## Phase B2, C, D

**Not implemented.**

---

## Remaining reasons ensureTvSchedules() may still run

- Feature flag disabled
- Any required window missing or zero-item orphan
- Probe error or indeterminate result
- Conditional call B: `!alternatePlaylist` after first load
- Conditional call C: `scheduleState === "REBUILDING"`
- `tvDailySchedule`, `tvPlaylistTable`, admin paths (unchanged unconditional ensure)
