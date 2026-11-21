# TipLink staging acceptance registry

**Initiative:** TipLink product completion (separate from Wave 3 — records remain immutable).

**Purpose:** Single source for staging E2E acceptance IDs. **Do not fabricate rows** — fill only after Product/QA verifies staging data.

| Field | Value |
|--------|--------|
| TipLink ID (UUID) | _PENDING — owner to supply_ |
| Public slug | _PENDING_ |
| Host ID | _PENDING_ |
| Event channel ID | _PENDING_ |
| Event ID (acceptance) | _PENDING (e.g. partner QA event)_ |
| Publication status | _draft \| published_ |
| Staging frontend origin | _PENDING (no Wave 3 pin change without Release)_ |
| Staging backend API | `https://tipmanna-staging.onrender.com/api/v1` |
| Verified by | _PENDING_ |
| Verification date (UTC) | _PENDING_ |

## Owner action required (before staging acceptance)

1. **Product/QA host** with access to acceptance event channel.
2. Create or designate **one TipLink** (draft + published paths both in scope).
3. Provide **host token** or QA storage state authorized for `GET /host/tiplinks/event/{eventId}` and preview route.
4. **Release/TAYE:** set on target deployment build:
   - `NEXT_PUBLIC_ANALYTICS_SDK_V2=true`
   - `NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2=true`

## Acceptance procedure (post-registry)

| Step | Route | Evidence |
|------|-------|----------|
| 1 | `/l/preview/{id}` with host session | Page 200, player visible |
| 2 | Play ≥ 10s | HAR: `POST …/tv/analytics`, `v: 2`, `surface: "tiplink"` |
| 3 | `/l/{slug}` public | Same ingest pattern |
| 4 | Optional | Read-only DB trace (existing wave3 trace tooling) |

Artifacts: prefix `tiplink-product-acceptance-*.json` (new initiative only).

## Feature-flag policy (implemented)

TipLink v2 SDK requires **both** compile-time flags at build time. **No** pathname bypass on integration branch `feature/tiplink-product-completion`.

Legacy `tvAnalytics` path remains when v2 flags are off (XOR adapter unchanged).
