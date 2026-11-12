# TipLink staging acceptance registry

**Initiative:** TipLink product completion (separate from Wave 3 — records remain immutable).

**Purpose:** Single source for staging E2E acceptance IDs. **Do not fabricate rows** — fill only after Product/QA verifies staging data.

| Field | Value |
|--------|--------|
| TipLink ID (UUID) | `07e18a5a-5c75-4665-b321-f0fe294b1809` |
| Public slug | `ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea` |
| Host ID | `579f5a20-8c8e-44dd-8270-6dcfad410f22` (staging public payload, 2026-11-11) |
| Event channel ID | `7fc7b429-c7b1-42bf-a1bf-954b36b20150` |
| Event ID (acceptance) | `01a4b10b-f80d-43e8-a78b-5f872e6c353e` |
| Publication status | **published** (staging `GET /tiplinks/{slug}` → HTTP 200, 2026-11-11) |
| Staging frontend origin | `https://tipmanna-fj3ffgvfq-test01.vercel.app` (programme pin SHA `2267ee6`, ref `dev`) |
| Vercel deployment ID (`2267ee6`) | `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9` |
| Immutable deployment URL (`2267ee6`) | `https://tipmanna-testing-g0hjhjlep-telepse-companys-projects.vercel.app` |
| Staging backend API | `https://tipmanna-staging.onrender.com/api/v1` (see evidence section) |
| Verified by | **Tipmanna Engineering** (QA evidence owner) |
| Verification date (UTC) | Fixture 2026-11-11T17:08Z; Test01 technical acceptance **2026-11-12** (see §Test01 final acceptance) |
| Product/QA playback authorization | **AUTHORIZED** — [`evidence/tiplink-product-acceptance-20261112/product-qa-authorization-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/product-qa-authorization-2026-11-12.md) |
| QA evidence owner | **Tipmanna Engineering** |
| **Test01 programme status** | **CLOSED** (signed 2026-11-12) — [`evidence/tiplink-product-acceptance-20261112/TEST01-PROGRAMME-CLOSURE-MEMO-SIGNED-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/TEST01-PROGRAMME-CLOSURE-MEMO-SIGNED-2026-11-12.md) |
| Test01 acceptance deployment pin | `https://tipmanna-testing-g0hjhjlep-telepse-companys-projects.vercel.app` · `2267ee6c4e2e3347d7af90cea7a48b0cca699ee2` · `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9` |

## Read-only verification evidence (2026-11-11)

| Probe | Result |
|-------|--------|
| Test01 `GET /api/deploy-info` | `2267ee6`, ref `dev`; `analytics.sdkV2`: **true** |
| Staging `GET /api/v1/tiplinks/{slug}` | **200**, `status: published`, IDs match table |
| Test01 `GET /l/{slug}` | **200**, page body matches fixture title |
| Test01 `GET /l/preview/{id}` | **200** (unauthenticated; host SSR outcome not validated here) |
| Staging `GET /health?deploy=1` | **200**, backend git `d26d09b7` (live staging deploy; distinct from Wave 3 BE pin docs) |

## Build flags (Test01 `2267ee6`)

| Flag | Confidence |
|------|------------|
| `NEXT_PUBLIC_ANALYTICS_SDK_V2` | **VERIFIED** (`deploy-info.analytics.sdkV2: true`) |
| `NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2` | **RELEASE OWNER ATTESTED** (build-time for `dpl_8qjMR…`) — [`release-owner-attestation-build-flag-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/release-owner-attestation-build-flag-2026-11-12.md); **not** an exported Vercel env snapshot |

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

## Coordinated assessment (2026-11-11T18:05Z)

**Scope:** Test01 `2267ee6` only — Wave 3 records unchanged.

| Decision | Status | Owner / route |
|----------|--------|----------------|
| Accountable Product/QA owner (named) | **PENDING** — not in repo | Programme / Product owner to name individual in ticket |
| Written playback authorization | **NOT AUTHORIZED / PENDING** | Same owner; ticket system (not git) |
| Acceptance scope (public vs preview+public) | **PENDING owner decision** | Product owner — registry procedure lists **both** `/l/preview/{id}` and `/l/{slug}` |
| QA evidence capture owner (named) | **PENDING** | QA lead assigned by Product owner when authorization recorded |
| Host-preview session | **NOT SCHEDULED** — blocked on written auth | Host QA via approved storage/session process; **no credentials in git** |

### Build-time `NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2` (`2267ee6`)

**Result:** **NOT CONFIRMED** for deployment `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9` (build @ `2026-11-11T15:22:07Z`, git `2267ee6` on `dev`).

**Verified (deployment-bound):** Vercel `inspect` + build log line `Commit: 2267ee6`; `vercel curl` `GET …g0hjhjlep…/api/deploy-info` → `2267ee6`, `analytics.sdkV2: true` (no TipLink surface field). Evidence: [`evidence/tiplink-test01-2267ee6-deployment-binding-2026-11-12T0730Z.json`](./evidence/tiplink-test01-2267ee6-deployment-binding-2026-11-12T0730Z.json).

**Alias drift (2026-11-12):** Test01 alias currently serves `f15ebfd` on `dpl_AunauxedZ6mjK2azXDK7zDevVpn1` — use **immutable URL** or deployment id above for `2267ee6` probes.

**Insufficient for build-time proof:** Current `vercel env ls` (project config); runtime `deploy-info` on live alias; client chunk scans (`tiplink-analytics` imports SDK paths unconditionally).

**Approved route to close gap:** Release owner — Vercel dashboard **deployment-scoped env snapshot** for `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9`, or formal attestation referencing that id; or future `deploy-info` TipLink surface field on an approved deploy.

### Playback / acceptance

- **Playback authorization (2026-11-12):** **AUTHORIZED** — Tipmanna Engineering; host-preview availability **confirmed** ([`product-qa-authorization-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/product-qa-authorization-2026-11-12.md)).
- **Execution (2026-11-12):** [`ACCEPTANCE-EXECUTION-REPORT-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/ACCEPTANCE-EXECUTION-REPORT-2026-11-12.md) · [`tiplink-product-acceptance-summary-2026-11-12.json`](./evidence/tiplink-product-acceptance-20261112/tiplink-product-acceptance-summary-2026-11-12.json).

## Acceptance 2026-11-12 (immutable `dpl_8qjMR…`)

| Flow | Result | Evidence |
|------|--------|----------|
| Public `/l/{slug}` — SSR fixture | **PARTIAL PASS** | `public-page-body-sample.txt` (published + IDs match) |
| Public — playback + analytics | **INCOMPLETE** | No HAR; no `POST …/tv/analytics` observed |
| Host `/l/preview/{id}` | **BLOCKED** | `preview-page-body-sample.txt` — host login required; session not in runner |
| Analytics `v:2` + `surface:tiplink` | **NOT VERIFIED** | — |

**Programme closure:** **NOT CLOSED** — HAR + preview with authorized host session still required.

## Acceptance reconciliation (2026-11-12, post browser capture)

Engineering reported v2 TipLink analytics on **public + preview**; reconciliation against staging API shows **wrong fixture** (Brahman / Wave 3 channel), not the registry Ronaldo acceptance TipLink.

| Check | Result | Evidence |
| --- | --- | --- |
| Analytics shape (`v:2`, `surface:tiplink`, encounter + start) | **PASS** (reported; wrong page) | [`analytics-observed-vs-expected-2026-11-12.json`](./evidence/tiplink-product-acceptance-20261112/analytics-observed-vs-expected-2026-11-12.json) |
| **Approved fixture** — public playback + analytics IDs | **FAIL** | Observed `7fc7b429` expected; got `17456868-…` + Brahman `itemId` |
| **Approved fixture** — preview playback + analytics IDs | **FAIL** | Same observed ids as public capture |
| Playback ≥10s (both flows) | **NOT VERIFIED** | No HAR in repo; `video_start` ≠ duration proof |
| `POST …/tv/analytics` status + body on file | **BLOCKED** | Redacted HAR not committed |
| Repeat on approved routes | **REQUIRED** | [`FIXTURE-RECONCILIATION-REPORT-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/FIXTURE-RECONCILIATION-REPORT-2026-11-12.md) |

**Programme closure:** **NOT CLOSED** — re-run acceptance on **Ronaldo** routes only; file HAR + duration proof; then formal closure memo.

## Acceptance manual capture — correct fixture (2026-11-12, supersedes wrong-fixture analytics)

**Deployment:** `https://tipmanna-testing-g0hjhjlep-telepse-companys-projects.vercel.app` (`2267ee6`, `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9`)

**Index:** [`MANUAL-ACCEPTANCE-CORRECT-FIXTURE-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/MANUAL-ACCEPTANCE-CORRECT-FIXTURE-2026-11-12.md) · [`tiplink-product-acceptance-summary-2026-11-12.json`](./evidence/tiplink-product-acceptance-20261112/tiplink-product-acceptance-summary-2026-11-12.json) (updated)

Wrong-fixture reconciliation **preserved:** [`FIXTURE-RECONCILIATION-REPORT-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/FIXTURE-RECONCILIATION-REPORT-2026-11-12.md)

### Public flow `/l/{slug}` (final)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Approved fixture identity (`eventId`, channel, `itemId`) | **PASS** | [`tiplink-manual-acceptance-public-2026-11-12.json`](./evidence/tiplink-product-acceptance-20261112/tiplink-manual-acceptance-public-2026-11-12.json) |
| Analytics `v:2` + `surface:"tiplink"` | **PASS** | Same |
| Watch duration ≥ 10s | **PASS** — **58.416s** | Same |
| `POST …/tv/analytics` HTTP 200 + response body | **PASS** | [`tiplink-manual-network-evidence-2026-11-12.json`](./evidence/tiplink-product-acceptance-20261112/tiplink-manual-network-evidence-2026-11-12.json) (owner-supplied manual network evidence; **no HAR in repo**) |
| Ingest `accepted:2`, `duplicates:[]`, `rejected:[]`, `cardsPersisted:0` | **PASS** (recorded) | Same — zero cards **not** scored as failure |
| **Overall flow acceptance** | **PASS (technical)** | Awaiting formal programme sign-off |

### Host preview flow `/l/preview/{id}` (final)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Approved fixture identity | **PASS** | [`tiplink-manual-acceptance-preview-2026-11-12.json`](./evidence/tiplink-product-acceptance-20261112/tiplink-manual-acceptance-preview-2026-11-12.json) |
| Analytics `v:2` + `surface:"tiplink"` | **PASS** | Same |
| Authorized host session | **PASS** | Product/QA authorization + successful preview capture |
| Watch duration ≥ 10s | **PASS** — **39.202s** | Same |
| `POST …/tv/analytics` HTTP 200 + response body | **PASS** | [`tiplink-manual-network-evidence-2026-11-12.json`](./evidence/tiplink-product-acceptance-20261112/tiplink-manual-network-evidence-2026-11-12.json) |
| **Overall flow acceptance** | **PASS (technical)** | Awaiting formal programme sign-off |

### Identifier reconciliation (final)

| Field | Public & preview | Disposition |
|-------|------------------|-------------|
| `sessionId` | `ee02fd56-99f1-4a34-be39-5d38ceb8c12e` (shared) | **ACCEPTED** — single browser session (preview then public) — [`identifier-reconciliation-manual-capture-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/identifier-reconciliation-manual-capture-2026-11-12.md) |
| `eventId` | `01a4b10b-f80d-43e8-a78b-5f872e6c353e` (shared) | **PASS** — expected |
| `activationId` | Not in payload extracts | **NOT REQUIRED** — non-blocking limitation |

### Programme closure (Test01)

| Item | Status |
|------|--------|
| **Technical acceptance** | **COMPLETE** (both flows) |
| Signed closure memo | [`TEST01-PROGRAMME-CLOSURE-MEMO-SIGNED-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/TEST01-PROGRAMME-CLOSURE-MEMO-SIGNED-2026-11-12.md) (Product/QA + Release owner, **2026-11-12**) |
| **Formal programme status** | **CLOSED** |
| Evidence index | [`MANUAL-ACCEPTANCE-CORRECT-FIXTURE-2026-11-12.md`](./evidence/tiplink-product-acceptance-20261112/MANUAL-ACCEPTANCE-CORRECT-FIXTURE-2026-11-12.md) |
| Redacted HAR in repo | **NOT FILED** — non-blocking; procedure prefers HAR for audit replay |
