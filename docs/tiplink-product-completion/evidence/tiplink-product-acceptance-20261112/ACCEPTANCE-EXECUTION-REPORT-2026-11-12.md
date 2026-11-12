# TipLink Test01 — controlled acceptance execution report

**UTC:** 2026-11-12  
**Immutable base:** `https://tipmanna-testing-g0hjhjlep-telepse-companys-projects.vercel.app`  
**Deployment:** `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9` · `bld_r28mcl8n0` · commit `2267ee6`

## Approvals recorded

| Gate | Reference |
| --- | --- |
| Release Owner build flag | [`release-owner-attestation-build-flag-2026-11-12.md`](./release-owner-attestation-build-flag-2026-11-12.md) — **RELEASE OWNER ATTESTED** |
| Product/QA authorization | [`product-qa-authorization-2026-11-12.md`](./product-qa-authorization-2026-11-12.md) |

## A. Public link

**Route:** `/l/ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea`  
**Method:** `vercel curl` (deployment protection bypass — not unauthenticated public curl)  
**Timestamp:** 2026-11-12

| Check | Result |
| --- | --- |
| Document fetch | **PARTIAL PASS** — HTML ~44 581 bytes; SSR payload includes `tipLink.id` = `07e18a5a-5c75-4665-b321-f0fe294b1809`, `status: published`, `eventChannelId` = `7fc7b429-c7b1-42bf-a1bf-954b36b20150` |
| Client hydration / player visible | **NOT VERIFIED** — shell shows loading skeleton in RSC; no browser play ≥10s |
| Playback | **NOT RUN** |
| `POST …/tv/analytics` | **NOT OBSERVED** |
| HAR | **NOT CAPTURED** |

**Unauthenticated `curl.exe`:** HTTP **302** (deployment protection) — not used as acceptance proof.

**Artifact:** [`public-page-body-sample.txt`](./public-page-body-sample.txt)

## B. Host preview

**Route:** `/l/preview/07e18a5a-5c75-4665-b321-f0fe294b1809`  
**Timestamp:** 2026-11-12

| Check | Result |
| --- | --- |
| Document fetch (vercel curl) | **BLOCKED** — SSR includes message: *"Host login required. Sign in to your host account to continue."* |
| Authorized host session | **Not available** in this automation session (no credentials stored; per instruction) |
| Playback / analytics | **NOT RUN** |

**Artifact:** [`preview-page-body-sample.txt`](./preview-page-body-sample.txt)

**Browser automation:** Navigating without Vercel bypass redirected to Vercel **Login** — not used for acceptance.

## C. Analytics v2 / `surface: "tiplink"`

| Requirement | Status |
| --- | --- |
| `v: 2` in batch | **NOT VERIFIED** — no capture |
| `surface: "tiplink"` | **NOT VERIFIED** — no capture |
| HAR | **None** |

## D. Deploy pin

| Probe | Result |
| --- | --- |
| `GET /api/deploy-info` | `2267ee6`, `analytics.sdkV2: true` |

**Artifact:** [`deploy-info-2267ee6.json`](./deploy-info-2267ee6.json)

## Summary verdict

| Flow | Acceptance |
| --- | --- |
| Public — fixture SSR on immutable deploy | **PARTIAL** |
| Public — playback + analytics | **FAIL / INCOMPLETE** |
| Host preview | **BLOCKED** (no host session in runner) |
| Programme closure | **NOT CLOSED** |

## Remaining (Tipmanna Engineering)

1. Run host-preview flow with authorized **off-repo** session (browser + Vercel bypass or approved network path).
2. Play ≥10s public + preview; capture **redacted** HAR with `POST …/tv/analytics`, `v: 2`, `surface: "tiplink"`.
3. Sign acceptance rows in registry when evidence attached.
