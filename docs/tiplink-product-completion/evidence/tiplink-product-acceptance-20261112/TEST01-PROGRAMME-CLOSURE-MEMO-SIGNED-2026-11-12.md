# TipLink Test01 programme — closure memo (signed)

| Field | Value |
|-------|--------|
| **Programme status** | **CLOSED** |
| **Deployment pin** | `https://tipmanna-testing-g0hjhjlep-telepse-companys-projects.vercel.app` |
| **Git / deploy** | `2267ee6c4e2e3347d7af90cea7a48b0cca699ee2` · `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9` |
| **Acceptance fixture** | TipLink `07e18a5a-5c75-4665-b321-f0fe294b1809` · Ronaldo slug · channel `7fc7b429-c7b1-42bf-a1bf-954b36b20150` |
| **Memo date (UTC)** | 2026-11-12 |

## Technical acceptance summary

Both **public** and **authorized host-preview** flows on the approved Ronaldo fixture meet the documented Test01 acceptance criteria on the pinned deployment.

| Flow | Technical result |
|------|------------------|
| Public `/l/{slug}` | **PASS** |
| Host preview `/l/preview/{id}` | **PASS** |

**Evidence index:** [`MANUAL-ACCEPTANCE-CORRECT-FIXTURE-2026-11-12.md`](./MANUAL-ACCEPTANCE-CORRECT-FIXTURE-2026-11-12.md) · [`tiplink-product-acceptance-summary-2026-11-12.json`](./tiplink-product-acceptance-summary-2026-11-12.json) · [`Tiplink-staging-acceptance-registry.md`](../../Tiplink-staging-acceptance-registry.md) § Test01 final acceptance.

Historical wrong-fixture (Brahman) capture remains on file and is **not** rewritten: [`FIXTURE-RECONCILIATION-REPORT-2026-11-12.md`](./FIXTURE-RECONCILIATION-REPORT-2026-11-12.md).

## Criteria satisfied (evidence-backed)

| Criterion | Public | Preview | Evidence |
|-----------|--------|---------|----------|
| Approved fixture + channel IDs | PASS | PASS | Manual capture JSONs |
| `v:2`, `surface:"tiplink"` | PASS | PASS | Same |
| Playback ≥10s | PASS (58.416s) | PASS (39.202s) | Same |
| `POST /tv/analytics` HTTP 200 + body | PASS | PASS | [`tiplink-manual-network-evidence-2026-11-12.json`](./tiplink-manual-network-evidence-2026-11-12.json) |
| Ingest: 2 accepted, 0 dup, 0 rejected | PASS | PASS | Same (`cardsPersisted: 0` recorded; **not** a failure criterion) |
| `NEXT_PUBLIC_ANALYTICS_SDK_V2` | PASS | PASS | `deploy-info` (registry) |
| `NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2` | PASS (build-time) | PASS (build-time) | Release owner attestation |
| Product/QA playback authorization | PASS | PASS | [`product-qa-authorization-2026-11-12.md`](./product-qa-authorization-2026-11-12.md) |

## Non-blocking evidence limitations

1. **Redacted HAR not in repo** — Registry procedure **prefers** HAR artifacts; HTTP status and exact response bodies are recorded as **owner-supplied manual network evidence**. No HAR files are claimed on disk.
2. **`activationId` not in payload extracts** — **NOT REQUIRED** by registry steps 1–3; optional SDK field ([`identifier-reconciliation-manual-capture-2026-11-12.md`](./identifier-reconciliation-manual-capture-2026-11-12.md)).
3. **Shared `sessionId`** across flows — **Accepted** for Test01 (single browser session, preview then public); documented in identifier reconciliation.
4. **Optional DB trace (procedure step 4)** — **NOT REQUIRED**; not executed.

## Formal closure approvals (recorded)

| Role | Accountable party | Signature | Date (UTC) |
|------|-------------------|-----------|------------|
| Product/QA acceptance | **Tipmanna Engineering** | T.E | 2026-11-12 |
| Release owner | **Tipmanna Engineering** (release owner capacity) | T.E | 2026-11-12 |

**Pre-execution authorization on file:** Playback controlled acceptance — Tipmanna Engineering, 2026-11-12 ([`product-qa-authorization-2026-11-12.md`](./product-qa-authorization-2026-11-12.md)).

## Programme disposition

- **Technical acceptance:** **COMPLETE**
- **Programme closure:** **CLOSED** (signatures recorded 2026-11-12)
