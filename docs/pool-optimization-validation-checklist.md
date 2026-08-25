# Pool Optimization Validation — Manual Checklist

Use this checklist for staging sign-off before production and before starting postponed optimizations. Do not skip observation windows from the implementation protocol.

## Cold `/tv` network

- [ ] Open DevTools Network on cold `GET /tv` (global, no `?community=`).
- [ ] Confirm exactly **1** `GET .../tv/schedule` within 2s of mount (not 2).
- [ ] Repeat cold load with `?community=<active-community-id>`.
- [ ] Looper reaches `isReady`; playback starts without stuck skeleton beyond baseline.

## Opt-2 community switch (post keyed-coalesce fix)

- [ ] Soft path: on `/tv`, trigger `?community=B` via client navigation while throttling network — B schedule loads, not A.
- [ ] Picker path: `pickCommunity` still performs full-page navigation (`navigateToTvSource`) — no regression expected.
- [ ] Pusher `tv-schedule-updated` still triggers a refresh while coalesced with interval refetch (same community).

## Explore metrics payload parity

- [ ] Snapshot `GET /api/v1/contents/feed/default-boot?count=8` on staging (same DB) before vs after Opt-1 deploy.
- [ ] `POST /api/v1/contents/channels/metrics/batch` with 8 UUIDs matches 8× single-channel GET field values.
- [ ] Restricted channel still returns `{ restricted: true, community }`.

## Staging P2024 observation (4–8 hours)

- [ ] Render logs: P2024 count stable or down under explore + TV concurrent load.
- [ ] Pool timeout / `AnalyticsEvent` pressure reduced vs baseline.
- [ ] No increase in `/tv/schedule` 503 rate.

## Warm cron verification (include one :00 or :30 tick)

- [ ] `[tvCron] generateSchedule` success or `skipped (lock held by peer)` — normal.
- [ ] Warm tick completes without multi-second full item loads in existence loop.
- [ ] Invoke warm `generateSchedule()` twice — second run creates no new rows.

## Schedule payload comparison

- [ ] `GET /api/v1/tv/schedule` ETag/checksum stable on warm DB before vs after Opt-3 deploy (same wall time).
- [ ] Item count, `position` order, and `broadcastEpoch` unchanged for same DB state.

## Automated test gate (CI/local)

- [ ] `cd frontend && npm test` — coalesce + orchestration specs pass.
- [ ] `cd backend && npm test` — batch metrics + warm-path specs pass.
- [ ] `cd backend && npm run build` — `dist/` updated before production `npm start`.

## Sign-off

| Environment | Date | Observer | Result |
|-------------|------|----------|--------|
| Staging | | | |
| Production | | | |

**Gate to postponed optimization phase:** all checklist items above signed off on staging; Opt-2 keyed-coalesce fix deployed; no new P2024 spike in 24h production observation.
