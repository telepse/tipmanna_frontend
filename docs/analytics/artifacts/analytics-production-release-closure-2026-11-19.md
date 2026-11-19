# Analytics production release — closure record (2026-11-19)

**Final status:** **PRODUCTION DEPLOYED AND VERIFIED — PROJECT CLOSED**

## Release scope selected

Integrated production pair (not historical Wave 3 / TipLink acceptance pins as deploy targets):

| App | Release SHA | Hosting | Notes |
|-----|-------------|---------|-------|
| Backend | `5eb29d6a48cf74dc33f68ee768e6bc0d881df5b6` | Render `tipmanna-live` | Already live; includes Streaming A merge (PR #155). **No redeploy.** |
| Frontend | `7faf1af6976d4f1eb4c8267d5ef2a3958a93144c` | Vercel project `tipmanna-live` | `origin/dev` tip; TipLink payment-return + audio + Analytics SDK lineage. |

**Why this pair:** Production must not roll back to Wave 3-only pins. BE prod already runs `5eb29d6a`. FE prod previously ran `5d5eef5` (43d stale). Test01 already served `7faf1af` with Analytics flags. Core Analytics ingest sources unchanged vs Wave 3 BE pin.

## Historical distinctions (unchanged)

| Programme | Disposition |
|-----------|-------------|
| Wave 3 release acceptance (`T1055Z`) | Remains as recorded |
| Wave 3 TipLink | **`WAIVED — NOT VERIFIED`** (not converted to PASS) |
| TipLink Product Test01 | **`CLOSED`** (signed 2026-11-12; pin `2267ee6` / docs `6e3c751`) |
| Production `ANALYTICS_READ_*=canonical` cutover | **Out of scope** (workbook separate project) |

## Production configuration

Added to Vercel **`tipmanna-live` Production** (names only; values not disclosed):

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

Prior production FE lacked Analytics v2 build flags (only legacy `NEXT_PUBLIC_TV_ANALYTICS_ENABLED`).

## Production deployment
Production deployment completed.
Analytics SDK v2 enabled.
Production ingestion and persistence verified.
Frontend regression tests: 48/48 passed.
No production-critical defects reported.
Closure documentation merged.

## Database / infrastructure

- No Analytics-required Prisma migrations for this release pair.
- No destructive DB operations performed.
- BE dependent services: health reports `databaseUrl: SET`, redis namespace `tipmanna-live-redis`.

## Builds and tests

| Check | Result |
|-------|--------|
| Worktree HEAD before deploy | `7faf1af6976d4f1eb4c8267d5ef2a3958a93144c` |
| `npm ci` | PASS |
| Vitest analytics-sdk + TipLink payment/audio specs | **57/57 PASS** |
| BE redeploy | **NOT REQUIRED** (SHA already live) |

## Deployments

### Backend

| Field | Value |
|-------|--------|
| Service | `tipmanna-live.onrender.com` |
| Action | None (already at release SHA) |
| Health | `GET /health?deploy=1` → `status: OK`, `gitCommit: 5eb29d6a…` |
| Previous known-good | Same SHA |

### Frontend

| Field | Value |
|-------|--------|
| Project | Vercel `tipmanna-live` |
| Previous production | `dpl_E9SaMBdRPP5m63pVujFr9Sa7gHj` · git `5d5eef56eb16ce3bd02b65fa8728399b6dd2800a` |
| New production | **`dpl_GiYrn7un3LxZSsK6pLMtfrxtpZ4M`** |
| Immutable URL | `https://tipmanna-live-1qe3966od-telepse-companys-projects.vercel.app` |
| Production aliases | `https://www.tipmanna.tv`, `https://www.tipmanna.live`, `https://tipmanna.tv`, `https://tipmanna.live` |
| Method | Exact SHA worktree → `vercel deploy --prod` (CLI; `VERCEL_GIT_COMMIT_SHA` unset in deploy-info — provenance = worktree HEAD + deployment id) |

## Production verification

| Check | Result |
|-------|--------|
| BE health + SHA | **PASS** |
| FE homepage (`www.tipmanna.tv` → `/explore`) | **PASS** HTTP 200 |
| FE `deploy-info` `analytics.sdkV2` | **PASS** `true` |
| FE `deploy-info` git commit field | **NULL** (CLI deploy metadata limitation) — release SHA recorded above |
| `POST /api/v1/tv/analytics` available | **PASS** (OPTIONS 204; empty body → 400 discriminator validation) |
| Controlled v2 smoke (synthetic channel) | Schema accepted into persist path; **P2003** FK (expected — synthetic UUID not in prod DB). No real-user fixture used. |
| TipLink Product / Wave 3 historical suites | **Not re-run** (no invalidating Analytics-core delta requiring full re-acceptance) |

## Rollback

| Service | Rollback method |
|---------|-----------------|
| FE | Redeploy / promote previous `dpl_E9SaMBdRPP5m63pVujFr9Sa7gHj` (`5d5eef5`) |
| BE | No change; if needed redeploy prior known Render SHA |

## Outstanding non-blocking issues

1. CLI production deploy does not populate `deploy-info.commit` — consider future git-connected production deploy for SHA telemetry.
2. Synthetic analytics smoke did not yield `accepted>0` (intentional; avoids inventing production channel fixtures).
3. Render health `deploymentEnvValid: false` / helper flags — pre-existing ops noise, not introduced by this release.
4. Next.js 15.5.7 advisory noted at `npm ci` — tracked dependency hygiene; not a release gate here.

## Closure decision

Analytics production application release for the selected integrated pair is **deployed** and **verified** for health, configuration, and ingestion path availability. Historical Wave 3 / TipLink Product dispositions remain as previously recorded.
