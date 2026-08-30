# Phase 2B Final Report — Index Validation and Migration Cleanup

**Date:** 2026-07-16  
**Scope:** Database indexes only. No application code, API, analytics, cache, TV, access, or enforcement changes.

---

## 1. Files modified

| File                                                                                      | Change                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/prisma/schema.prisma`                                                            | Removed `@@index([videoChannelId, day])` from `VideoChannelDailyRollup`; retained `@@index([videoChannelId, type])` on `AnalyticsEvent` |
| `backend/prisma/migrations/20260716150000_phase2b_drop_unused_rollup_index/migration.sql` | **NEW** forward migration — `DROP INDEX CONCURRENTLY` unused rollup composite                                                           |
| `backend/scripts/phase2b-explain-analyze.ts`                                              | Extended with production OR-shaped SQL, metrics parsing, `pg_indexes` probe                                                             |
| `docs/phase-2b-final-report.md`                                                           | This report                                                                                                                             |

**Not modified (migration-history safety):**

- `backend/prisma/migrations/20260715180000_phase2b_pool_indexes/migration.sql` — already applied; left intact

**Evidence artifacts:**

- `backend/scripts/phase2b-explain-output/before-1784136750204.txt`
- `backend/scripts/phase2b-explain-output/after-1784201416239.txt`
- `backend/scripts/phase2b-explain-output/production-or-1784212146985.txt`
- `backend/scripts/phase2b-explain-output/production-or-1784212146985.json`
- `backend/scripts/phase2b-explain-output/pg_indexes-1784211860559.json` (pre-cleanup index state)

---

## 2. Production Prisma query shapes inspected

### `batchSocialMetrics` (`channel-public-metrics.service.ts` L165–171)

```typescript
prisma.analyticsEvent.findMany({
  where: {
    OR: [{ channelId: { in: chunk } }, { videoChannelId: { in: chunk } }],
    type: { in: socialTypes }, // save, share_click, comment_submit, comment_like
  },
  select: { type: true, channelId: true, videoChannelId: true },
});
```

Chunk size: `LIVE_ENCOUNTER_BATCH_CHUNK = 150`.

### `liveViewsEncountersCompletesBatch` — engagement (`L212–223`)

```typescript
prisma.analyticsEvent.findMany({
  where: {
    OR: [{ channelId: { in: chunk } }, { videoChannelId: { in: chunk } }],
    type: { in: [video_encounter, video_complete] },
  },
  select: { type: true, channelId: true, videoChannelId: true },
});
```

### `liveViewsEncountersCompletesBatch` — watch_duration (`L235–246`)

```typescript
prisma.analyticsEvent.findMany({
  where: {
    OR: [{ channelId: { in: chunk } }, { videoChannelId: { in: chunk } }],
    type: AnalyticsEventType.watch_duration,
  },
  select: {
    channelId: true,
    videoChannelId: true,
    sessionId: true,
    payload: true,
  },
});
```

### Related batch fallback

- `batchGetChannelPublicMetrics` — rollup `findMany` on `VideoChannelDailyRollup` (`videoChannelId IN`, `day >= since`), then calls `liveViewsEncountersCompletesBatch` + `batchSocialMetrics` for live fallback.
- `batchChannelEncounters` — rollup path + `liveEncountersBatch` raw SQL with `OR (channelId = ec.id OR videoChannelId = ec.id)`.
- Single-channel `liveViewsEncountersCompletes` — same OR + `groupBy` / `findMany` pattern.

---

## 3. Index state (pg_indexes, pre-cleanup)

Captured via `npx tsx scripts/phase2b-explain-analyze.ts indexes`:

| Table                     | Index                                            | Status                                            |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| `VideoChannelDailyRollup` | `VideoChannelDailyRollup_videoChannelId_idx`     | Existing (retain)                                 |
| `VideoChannelDailyRollup` | `VideoChannelDailyRollup_videoChannelId_day_idx` | Phase 2B applied — **drop via cleanup migration** |
| `AnalyticsEvent`          | `AnalyticsEvent_videoChannelId_type_idx`         | Phase 2B applied — **retain**                     |
| `AnalyticsEvent`          | `AnalyticsEvent_channelId_idx`                   | Existing (used in BitmapOr)                       |
| `AnalyticsEvent`          | `AnalyticsEvent_surface_type_idx`                | Existing (used for social/watch OR)               |
| `AnalyticsEvent`          | `AnalyticsEvent_videoChannelId_createdAt_idx`    | Existing (superseded for type-filtered paths)     |

**Post-cleanup expected:** `VideoChannelDailyRollup_videoChannelId_day_idx` absent; all others unchanged.

**Cleanup migration not yet deployed** (blocked on pool connection limits during `prisma migrate deploy`). Run manually:

```bash
cd backend
npx prisma migrate deploy
npx tsx scripts/phase2b-explain-analyze.ts indexes   # verify drop
```

---

## 4. EXPLAIN ANALYZE — per-index verdict

### 4A. `VideoChannelDailyRollup(videoChannelId, day)` — **REMOVE**

| Metric                                   | Before               | After (indexes applied) | Production-or (current) |
| ---------------------------------------- | -------------------- | ----------------------- | ----------------------- |
| Index selected                           | `videoChannelId_idx` | `videoChannelId_idx`    | `videoChannelId_idx`    |
| Composite `videoChannelId_day_idx` used? | No                   | No                      | No                      |
| Execution time                           | 0.147 ms             | 1.256 ms\*              | 0.118 ms                |
| Output rows                              | 36                   | 38                      | 35                      |
| Rows removed by day filter               | 16                   | 17                      | 21                      |
| Buffer shared hits                       | 6                    | 5                       | 6                       |
| Heap blocks                              | 5                    | 4                       | 5                       |

\*After total time variance is not index-related; heap scan actual time remains sub-ms.

**Why planner rejects composite:** Table has ~50–56 rows per 16-channel probe. Existing `videoChannelId_idx` narrows efficiently; post-index `day` filter removes ~30% of ~55 rows — negligible cost. Composite index adds no measurable buffer, row, or latency benefit.

**Decision:** Remove from schema; drop via forward migration. Original applied migration **not rewritten**.

---

### 4B. `AnalyticsEvent(videoChannelId, type)` — production OR queries

#### `production_batchSocialMetrics_OR`

| Metric                          | Before (OR)                         | Production-or (indexes applied) |
| ------------------------------- | ----------------------------------- | ------------------------------- |
| Plan                            | `surface_type_idx` + channel filter | Same                            |
| `videoChannelId_type_idx` used? | No                                  | No                              |
| BitmapOr                        | No                                  | No                              |
| Execution time                  | 127.9 ms (cold)                     | **0.38 ms** (warm)              |
| Output rows                     | 36                                  | 21                              |
| Rows removed by filter          | 138                                 | 153                             |
| Buffer hits                     | 171                                 | 158                             |

**Why index not used:** Single-type-leading scan via `surface_type_idx` returns ~174 rows; only ~21 match channel OR. At this scale (~0.4 ms warm), planner prefers one index + filter over BitmapOr.

**Index justified for this query?** No direct benefit observed. Not a reason to remove the index — other queries benefit.

---

#### `production_liveEngagement_OR` (video_encounter + video_complete)

| Metric                             | Value                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Plan                               | **BitmapOr**                                                                            |
| Leg 1                              | `AnalyticsEvent_channelId_idx` → 3074 index rows                                        |
| Leg 2                              | **`AnalyticsEvent_videoChannelId_type_idx`** → **1208 index rows** (type in Index Cond) |
| Post-heap type filter rows removed | 1865                                                                                    |
| Execution time                     | **10.0 ms**                                                                             |
| Output rows                        | 1208                                                                                    |
| Buffer hits                        | 651 (24 in BitmapOr setup)                                                              |

**Why index IS used:** OR decomposes into `channelId IN (...)` and `(videoChannelId IN (...) AND type IN (...))`. The composite index serves the second leg precisely — type equality is in `Index Cond`, not a heap filter.

**Index justified for production?** **Yes** — this is an exact runtime query from `liveViewsEncountersCompletesBatch`.

---

#### `production_liveWatchDuration_OR` (watch_duration only)

| Metric                          | Value                                                                |
| ------------------------------- | -------------------------------------------------------------------- |
| Plan                            | `surface_type_idx` where `type = watch_duration` + channel OR filter |
| `videoChannelId_type_idx` used? | No                                                                   |
| BitmapOr                        | No                                                                   |
| Execution time                  | **0.99 ms**                                                          |
| Output rows                     | 114                                                                  |
| Rows removed by filter          | 1123                                                                 |
| Buffer hits                     | 436                                                                  |

**Why index not used:** Single equality on `watch_duration` via `surface_type_idx` scans ~1237 rows, keeps 114. At sub-ms scale planner prefers type-leading scan.

**Index justified for this query?** No direct benefit at current cardinality. Watch path is fast without new index.

---

#### `isolated_videoChannelId_watch_types` (videoChannelId-only, no OR)

| Metric                      | Before                                            | After                                                  |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| Index                       | `videoChannelId_createdAt_idx` + type heap filter | **`videoChannelId_type_idx`**                          |
| Execution time              | **513.2 ms**                                      | **4.95 ms** (after file) / **1.18 ms** (production-or) |
| Index-qualified rows        | 3266                                              | 1031–1322                                              |
| Rows removed by type filter | 2008                                              | **0** (type in Index Cond)                             |
| Buffer hits                 | 697                                               | 502–883                                                |
| Heap blocks                 | 644                                               | 480                                                    |

**Why index IS used:** Predicate is `videoChannelId IN (...) AND type IN (...)` without OR — perfect composite match. Eliminates ~62% wasted row qualification from `createdAt` index path.

---

### 4C. Summary: is `AnalyticsEvent(videoChannelId, type)` justified?

| Runtime query                          | Uses new index?        | Measurable benefit?                          |
| -------------------------------------- | ---------------------- | -------------------------------------------- |
| `batchSocialMetrics` OR                | No                     | No (already ~0.4 ms)                         |
| `liveEngagement` OR                    | **Yes (BitmapOr leg)** | **Yes** — precise type+channel qualification |
| `liveWatchDuration` OR                 | No                     | No (already ~1 ms)                           |
| `videoChannelId`-only watch/engagement | **Yes**                | **Yes** — 513 ms → ~5 ms (prior validation)  |

**Conclusion:** **Keep** `AnalyticsEvent(videoChannelId, type)`. It is selected on production-equivalent engagement OR queries and delivers large gains on videoChannelId+type paths. Social and watch_duration OR queries do not need it but are already fast; they are not harmed.

---

## 5. Migration history safety

| Migration                                         | Status              | Action                                   |
| ------------------------------------------------- | ------------------- | ---------------------------------------- |
| `20260715180000_phase2b_pool_indexes`             | **Already applied** | **Not modified** — preserves audit trail |
| `20260716150000_phase2b_drop_unused_rollup_index` | **Pending deploy**  | Forward-only cleanup                     |

Applying the cleanup migration is **idempotent** (`IF EXISTS`) and **non-destructive** to application data. It only drops an unused index.

---

## 6. Write-amplification assessment

| Index                                            | Inserts affected                                    | Assessment                                                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VideoChannelDailyRollup_videoChannelId_day_idx` | Daily rollup upserts                                | **Removing** eliminates redundant index maintenance with zero query benefit                                                                               |
| `AnalyticsEvent_videoChannelId_type_idx`         | Every `AnalyticsEvent` insert with `videoChannelId` | **Acceptable** — high-volume table, but index proven on hot live-fallback paths; one extra btree update per insert vs large read savings on explore batch |

---

## 7. Rollback migration

If `AnalyticsEvent_videoChannelId_type_idx` must be reverted:

```sql
-- prisma-migrate-disable-next-transaction
DROP INDEX CONCURRENTLY IF EXISTS "AnalyticsEvent_videoChannelId_type_idx";
```

To restore the dropped rollup index (not recommended — no demonstrated benefit):

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS "VideoChannelDailyRollup_videoChannelId_day_idx"
  ON "VideoChannelDailyRollup"("videoChannelId", "day");
```

Also restore `@@index([videoChannelId, day])` in `schema.prisma` if rolling back rollup drop.

---

## 8. Verification results

| Check                                                      | Result                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `npm test -- channel-public-metrics-batch`                 | **5/5 passed**                                            |
| `npm run build`                                            | **Succeeded** (exit 0)                                    |
| `npx prisma migrate status`                                | **Not completed** — pool `max clients reached` on staging |
| `npx prisma migrate deploy` (cleanup)                      | **Pending user approval** — migration file ready          |
| `npx tsx scripts/phase2b-explain-analyze.ts production-or` | **Completed** — see artifacts                             |
| `npx tsx scripts/phase2b-explain-analyze.ts indexes`       | **Completed** — pre-cleanup state captured                |

---

## 9. Production deployment recommendation

### Deploy now (schema sync + cleanup)

1. Merge changes (`schema.prisma`, new migration, explain script).
2. Off-peak: `npx prisma migrate deploy` — applies only `20260716150000_phase2b_drop_unused_rollup_index`.
3. Verify: `npx tsx scripts/phase2b-explain-analyze.ts indexes` — confirm `VideoChannelDailyRollup_videoChannelId_day_idx` gone.
4. Optional: `npx tsx scripts/phase2b-explain-analyze.ts production-or` — confirm `AnalyticsEvent_videoChannelId_type_idx` still used on engagement OR.

### Retain in production

- `AnalyticsEvent_videoChannelId_type_idx` ✅

### Remove from production

- `VideoChannelDailyRollup_videoChannelId_day_idx` ❌ (via pending cleanup migration)

### Do not add

- `(channelId, type)` — not validated; engagement OR uses existing `channelId_idx` leg
- `EventChannel(updatedAt)` — out of Phase 2B scope

### Behaviour guarantee

No application files changed. Prisma query shapes, result sets, analytics calculations, APIs, caches, TV, access, and enforcement are unchanged. Only unused DB index removed; proven index retained.

---

## 10. Exact query plan reference

Full plans are in:

- `backend/scripts/phase2b-explain-output/production-or-1784212146985.txt`
- `backend/scripts/phase2b-explain-output/before-1784136750204.txt`
- `backend/scripts/phase2b-explain-output/after-1784201416239.txt`

Key production OR engagement plan (abbreviated):

```
Bitmap Heap Scan on AnalyticsEvent
  -> BitmapOr
       -> Bitmap Index Scan on AnalyticsEvent_channelId_idx
       -> Bitmap Index Scan on AnalyticsEvent_videoChannelId_type_idx
            Index Cond: (videoChannelId = ANY(...) AND type = ANY(video_encounter, video_complete))
Execution Time: 10.035 ms | rows=1208 | Buffers: shared hit=651
```

Key isolated watch plan improvement (before → after):

```
BEFORE: videoChannelId_createdAt_idx → 3266 rows → filter 2008 → 513 ms
AFTER:  videoChannelId_type_idx      → 1031 rows → no type filter → 5 ms
```
