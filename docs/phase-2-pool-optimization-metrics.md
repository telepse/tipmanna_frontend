# Phase 2 Pool Optimization — Before/After Metrics

Evidence captured during implementation. Runtime DB measurements for Phase 2B require `DATABASE_URL` and `npx tsx scripts/phase2b-explain-analyze.ts`.

## Phase 2A — Cron staggering (complete)

| Metric                    | Before             | After                                 | Evidence                                                      |
| ------------------------- | ------------------ | ------------------------------------- | ------------------------------------------------------------- |
| Cron overlap at `:00/:30` | 6 jobs same minute | TV anchor `:00/:30`; others staggered | `cron-schedule.config.ts`, `cron-schedule.spec.ts` (12 tests) |
| Transaction count         | unchanged          | unchanged                             | No DB writes in stagger                                       |
| Pool peak at TV tick      | baseline           | reduced temporal clustering           | 2A plan + user staging validation                             |

## Phase 2C — Shared TV access batching

| Metric                                     | Before (legacy dual-batch) | After (union prefetch) | Evidence                                                                                                  |
| ------------------------------------------ | -------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Prisma `batchCommunityChannelAccess` calls | 2 per schedule resolve     | 1                      | `tv-schedule-shared-batch.equivalence.spec.ts` — duplicate channel IDs                                    |
| Prisma `eventChannel.findMany` (safety)    | 2 when batches overlap     | 1                      | same spec — `metrics: safety findMany` test                                                               |
| Prisma `batchCoOwnerChannelMeta`           | 2                          | 1                      | same spec — co-owner union test                                                                           |
| Endpoint latency                           | not measured in CI         | same outputs as legacy | 11 equivalence scenarios (anonymous, tipper, host, community, global, restricted, alternate-only, faulty) |
| Cache hit/miss                             | N/A                        | N/A                    | No cross-request cache added                                                                              |

**Scenarios explicitly demonstrated** (`tv-schedule-shared-batch.equivalence.spec.ts`):

- Duplicate channel IDs across ongoing/alternate
- Channels in alternate playlist only
- Removed channels (filter empty → fallback)
- Restricted channels (`RESTRICTED` in safety report)
- Community schedules (`communityId` on count where)
- Global schedules (no `communityId`)
- Anonymous, authenticated tipper, host owner viewers
- Co-owner/moderator badge path (single co-owner batch)
- Faulty channel not playable

## Phase 2D — Enforcement bulk update

| Metric                               | Before                                 | After                                                | Evidence                                                            |
| ------------------------------------ | -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `tvEnforcement.update` per cron tick | N (one per transition)                 | 0                                                    | `tv-enforcement-lifecycle.spec.ts`                                  |
| `tvEnforcement.updateMany`           | 0                                      | ≤2 (ACTIVE + COMPLETED buckets)                      | same                                                                |
| `findMany` scope                     | all `rolledBack: false`                | `rolledBack: false` + status IN (AUTHORIZED, ACTIVE) | service + tests                                                     |
| Transaction count                    | N auto-commits                         | ≤2 auto-commits                                      | bucketed updates                                                    |
| WHERE equivalence                    | per-row `where: { id }` + status check | `updateMany` with `id IN (...)` AND status guard     | `classifyEnforcementTransitionsFromWallClock` parity vs legacy loop |

## Phase 2E — Feature-card rollup

| Metric                        | Before                   | After                              | Evidence                                                                |
| ----------------------------- | ------------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| Per-card `count` queries      | 4 × cardIds (up to 1000) | 0                                  | `videoFeatureCardRollup.spec.ts`                                        |
| Per-card `groupBy` (sessions) | cardIds (up to 250)      | 0 (in-memory from single findMany) | `videoFeatureCardRollup.ts`                                             |
| Event fetch queries           | 2 groupBy + N counts     | 1 findMany + in-memory batch       | job refactor                                                            |
| Output parity                 | legacy loop              | identical                          | `computeFeatureCardRollupsLegacy` vs `computeFeatureCardRollupsBatched` |

## Phase 2B — Database indexes

| Index                                          | Query                   | Before (EXPLAIN ANALYZE)                                                                                                                   | After                                                                                   |
| ---------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `VideoChannelDailyRollup(videoChannelId, day)` | rollup batch `findMany` | Bitmap Index Scan on `VideoChannelDailyRollup_videoChannelId_idx` + **Filter** on `day >= since` (16 rows removed by filter); **0.147 ms** | Pending `prisma migrate deploy` then `npx tsx scripts/phase2b-explain-analyze.ts after` |
| `AnalyticsEvent(videoChannelId, type)`         | watch live-fallback     | Bitmap Index Scan on `AnalyticsEvent_videoChannelId_createdAt_idx` + **Filter** on type (2008 rows removed); **513 ms**                    | Pending migration + after script                                                        |
| `AnalyticsEvent(videoChannelId, type)`         | social OR fallback      | Index Scan on `AnalyticsEvent_surface_type_idx` + channel filter; **128 ms**                                                               | Pending migration + after script                                                        |

**Before capture:** `backend/scripts/phase2b-explain-output/before-1784136750204.txt`

**Expected after improvement:** rollup uses composite index (no post-index day filter); watch path uses `(videoChannelId, type)` instead of scanning all events per channel then filtering type.

Migration file: `backend/prisma/migrations/20260715180000_phase2b_pool_indexes/migration.sql`

**Deploy steps (requires approval):**

```bash
cd backend
npx prisma migrate deploy
npx tsx scripts/phase2b-explain-analyze.ts after
```

## Cancelled

- **2F** Compose cache warming — cache already on; no miss-rate evidence
- **2G** Notification batching — indexed dispatcher; serial delivery intentional
