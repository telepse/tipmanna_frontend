# Analytics production release — closure record (2026-11-19)

**Final status:** **`CLOSED — PRODUCTION VERIFIED`**

**Master tracker:** [../ANALYTICS-PRODUCTION-MASTER-TRACKER.md](../ANALYTICS-PRODUCTION-MASTER-TRACKER.md)

## Release scope selected

Integrated production pair (not historical Wave 3 / TipLink acceptance pins as deploy targets):

| App | Release SHA | Hosting | Notes |
|-----|-------------|---------|-------|
| Backend (Analytics-approved pin) | `5eb29d6a48cf74dc33f68ee768e6bc0d881df5b6` | Render `tipmanna-live` | Includes Streaming A merge (PR #155). Analytics ingest sources verified at this pin. |
| Backend (current live) | `614267837b1c6dbfd93c75c6cb60c8ebba8bfcf1` | Render `tipmanna-live` | Deployed 2026-11-19 via PR #156 (`fix/taye-ac9-prod-dist-refresh`). **Dist-only** Taye AC9 prune-cron refresh; **no `src` Analytics changes** vs approved pin (identical git blobs for `tvAnalytics.controller.ts`, `analytics.schema.ts`, `tv-analytics-v2-persist.ts`). |
| Frontend | `7faf1af6976d4f1eb4c8267d5ef2a3958a93144c` | Vercel project `tipmanna-live` | TipLink payment-return + audio + Analytics SDK lineage. |

**Why this pair:** Production must not roll back to Wave 3-only pins. FE corrective Production deploy restores Analytics SDK v2 after an intervening older Production tree briefly superseded the Analytics-enabled release. Core Analytics ingest sources remain unchanged through the subsequent Taye dist refresh.

## Historical distinctions (unchanged)

| Programme | Disposition |
|-----------|-------------|
| Wave 3 release acceptance (`T1055Z`) | Remains as recorded |
| Wave 3 TipLink | **`WAIVED — NOT VERIFIED`** (not converted to PASS) |
| TipLink Product Test01 | **`CLOSED`** (signed 2026-11-12; pin `2267ee6` / docs `6e3c751`) |
| Production `ANALYTICS_READ_*=canonical` cutover | **Out of scope** (workbook separate project) |

## Production configuration

Present on Vercel **`tipmanna-live` Production** (names only; values not disclosed):

- `NEXT_PUBLIC_ANALYTICS_SDK_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_EVENT_ROOM_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_CHANNEL_CLIENT_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_TV_LOOPER_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_TV_LOOPER_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_HOMEPAGE_PREVIEW_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_TV_FULLSCREEN_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_FEATURED_OVERLAY_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_EXPLORE_FEED_V2`
- `NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_FEED_V2`

## Database / infrastructure

- No Analytics-required Prisma migrations for this release pair.
- No destructive DB operations performed.
- BE dependent services: health reports `databaseUrl: SET`, redis namespace `tipmanna-live-redis`.

## Builds and tests

| Check | Result |
|-------|--------|
| Worktree HEAD for corrective FE deploy | `7faf1af6976d4f1eb4c8267d5ef2a3958a93144c` |
| Vitest TipLink payment-return + audio + analytics-sdk | **48/48 PASS** |
| BE Analytics-source redeploy for this closure | **NOT REQUIRED** (live SHA is descendant dist refresh; Analytics `src` identical) |

## Deployments

### Backend

| Field | Value |
|-------|--------|
| Service | `tipmanna-live.onrender.com` |
| Analytics-approved pin | `5eb29d6a48cf74dc33f68ee768e6bc0d881df5b6` |
| Current live SHA | `614267837b1c6dbfd93c75c6cb60c8ebba8bfcf1` |
| Intervening change | PR [#156](https://github.com/telepse/tipmanna_server/pull/156) — rebuild committed `dist/` so Taye AC9 idempotency prune cron / sandbox capability ship |
| Analytics impact | **None on source** — ingest/schema/persist blobs unchanged; live `OPTIONS /api/v1/tv/analytics` → 204 |
| Health | `GET /health?deploy=1` → `status: OK`, `gitCommit: 61426783…` |

### Frontend

| Field | Value |
|-------|--------|
| Project | Vercel `tipmanna-live` |
| Intended Analytics Production deployment | **`dpl_9RLvNnZSqfZye6RkZP5Re3fbYMud`** |
| Immutable URL | `https://tipmanna-live-lv6o67fyo-telepse-companys-projects.vercel.app` |
| Source commit | `7faf1af6976d4f1eb4c8267d5ef2a3958a93144c` |
| Created | 2026-11-19 13:14:10 GMT+0100 |
| Production aliases | `https://www.tipmanna.tv`, `https://www.tipmanna.live`, `https://tipmanna.tv`, `https://tipmanna.live` |
| Prior superseded Production | `dpl_7yKQV2cDJmxw1vR8hcViw6ks2Znd` (`amnhn4abf`) — older tree without Analytics `deploy-info` block (rollback target during corrective deploy) |
| Earlier Analytics-enabled deploy (not current live) | `dpl_GiYrn7un3LxZSsK6pLMtfrxtpZ4M` |
| Method | Exact SHA worktree → `vercel deploy --prod` (CLI; `VERCEL_GIT_COMMIT_SHA` unset in deploy-info — provenance = worktree HEAD + deployment id) |

## Production verification

| Check | Result |
|-------|--------|
| BE health | **PASS** (`status: OK`) |
| FE domains → `dpl_9RLvNnZ…` | **PASS** |
| FE `deploy-info` `analytics.sdkV2` | **PASS** `true` |
| FE homepage / explore | **PASS** HTTP 200 |
| Controlled production v2 smoke | **PASS** — see below |
| TipLink Product / Wave 3 historical suites | **Not re-run** (dispositions preserved) |

### Controlled production Analytics event (authorised; do not repeat)

| Field | Value |
|-------|--------|
| Endpoint | `POST https://tipmanna-live.onrender.com/api/v1/tv/analytics` |
| EventChannel | `036fc50c-3c55-437b-b5e8-e692f001015c` |
| Event | `share_click` (batch `v: 2`) |
| Event UID | `b109c2ab-4a79-453a-9244-29acbd2d77dc` |
| Session ID | `analytics-prod-closure-smoke-20261119` |
| Request UTC | `2026-11-19T12:02:10.145Z` |
| HTTP | **200** |
| Ack | `accepted: 1`, `rejected: []`, `duplicates: []`, `cardsPersisted: 0` |
| Persistence | Metrics `shares` **0 → 1** on the same EventChannel (independent of HTTP ack) |

## Rollback

| Service | Rollback method |
|---------|-----------------|
| FE | Re-alias / promote `dpl_7yKQV2cDJmxw1vR8hcViw6ks2Znd` only if Analytics FE release must be reverted |
| BE | No Analytics rollback indicated; PR #156 is intended Taye AC9 dist fix. If needed, redeploy prior Render SHA after owner approval |

## Outstanding non-blocking issues

1. CLI production deploy does not populate `deploy-info.commit` — consider future git-connected production deploy for SHA telemetry.
2. Render health `deploymentEnvValid: false` / helper flags — pre-existing ops noise, not introduced by Analytics release.
3. Live BE SHA advanced beyond Analytics-approved pin for Taye AC9 dist refresh; Analytics `src` identity confirmed — no Analytics rollback requested.

## Closure decision

Tipmanna Analytics production release for the selected integrated pair is **deployed** and **verified** for FE SDK v2, production ingest/persistence, and documented scope boundaries. Historical Wave 3 / TipLink Product dispositions remain as previously recorded.

**`CLOSED — PRODUCTION VERIFIED`**
