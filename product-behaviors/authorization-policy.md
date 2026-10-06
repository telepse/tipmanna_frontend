# Authorization Policy — Six User Sets

**Last aligned:** 2026-09-01 (event-tip ledger; dashboard one-grant; Connect name lock + org bank match; deferred enforce routes verified via hybrid-auth)

## Six user sets (only these)

| Set                                  | Primary session                        | Secondary session                                | Inactivity                                   |
| ------------------------------------ | -------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| **1. Host creator**                  | Tipper JWT 60d (never host in primary) | `hostToken` + `hostUser` 7d                      | Host 7d sliding                              |
| **2. Tipper**                        | Tipper JWT 60d                         | — (optional host secondary if signed in as host) | Tipper 60d sliding                           |
| **3. Tracked visitor (dummy guest)** | Visitor JWT (reminted on claim)        | —                                                | 24h sliding on `Visitor.lastActiveAt`        |
| **4. Untracked visitor**             | None                                   | —                                                | Not stored                                   |
| **5. Super admin**                   | Staff JWT 7d (`role: superadmin`)      | —                                                | Staff session                                |
| **6. Admin**                         | Staff JWT 7d (`role: admin`)           | —                                                | Staff session; **assigned permissions only** |

**Derived capabilities (not separate account types):** cohost (tipper + event-scoped cohost JWT), co-owner (Growth+ video entitlement), co-creator (Community host invited into content bank).

## Golden product rule

The **tipper account is the primary identifier** across the entire product. The primary session (`token` cookie + Redux `auth.user`) is always **tipper**, **visitor**, or **staff** — never host.

Host identity lives **only** in the secondary session:

| Cookie                 | Purpose                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `hostToken` (HttpOnly) | Host-role JWT for Tier B/C API calls                                                                     |
| `hostUser` (readable)  | Stable host identity marker: `id`, `username`, `eventSlug`, `eventCode`, `email`, `hostSessionExpiresAt` |

Cohost identity uses the same pattern:

| Cookie                   | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `cohostToken` (HttpOnly) | Cohost-role JWT scoped to one `eventId` |
| `cohostUser` (readable)  | `eventId`, `cohostId`, `email`          |

Host sign-in mints **both**: tipper 60d JWT → primary, host 7d JWT → `hostToken`. Cohost invite accept mints tipper 60d primary + cohost 7d secondary.

Never infer host authorization from `auth.user.role === "HOST"`, `tag === "EXISTING_HOST"`, or primary JWT role alone.

## Core invariant

`Tipper.id === Host.id` for every linked pair. Linkage is resolved only by `GET /auth/me/host-link` / `getHostLinkForUserId`. A linked tipper has Tier A reads; Tier B/C writes require an **active host session** (`hostToken` + unexpired `hostUser` marker where `hostUser.id === link.hostId`).

## Visitor (sets 3 and 4)

- **Untracked (set 4):** browse public content; no `Visitor` row; no JWT.
- **Tracked dummy (set 3):** created **only after a succeeded payment** (Stripe webhook or wallet debit). Identified by device key + IP + timestamps.
- **24h inactivity:** when `Visitor.lastActiveAt` is older than 24h, the row is **dead**. A new payment creates a **new** visitor; expired rows are never revived by device reuse.
- **Claim:** client calls `POST /visitors/claim-after-payment` after payment to receive a visitor JWT; merge into tipper only while unexpired (`410 Gone` after expiry).

## Session lifetimes (sliding, server-enforced)

| Role               | Inactivity window | JWT mint (max)  | Stored in                                |
| ------------------ | ----------------- | --------------- | ---------------------------------------- |
| Tipper (primary)   | 60 days           | 60d             | `token` + Tipper.lastActiveAt            |
| Host (secondary)   | 7 days            | 7d              | `hostToken` + Host.lastActiveAt          |
| Cohost (secondary) | 7 days            | 7d              | `cohostToken` + EventCohost.lastActiveAt |
| Visitor            | 24 hours          | remint on claim | visitor JWT + Visitor.lastActiveAt       |
| Staff              | 7 days            | 7d              | staff token                              |

Forced re-auth: set `AUTH_TOKEN_MIN_IAT` (unix) at deploy to invalidate pre-migration JWTs.

## Host plans (entitlements)

| Plan             | Enum             | Includes                                                |
| ---------------- | ---------------- | ------------------------------------------------------- |
| Free             | `NONE`           | Basic host features                                     |
| Growth (Premium) | `HOST_PREMIUM`   | Advanced analytics, co-owners, tip layout, playlists, … |
| Community        | `HOST_COMMUNITY` | All Growth + community TV, memberships, co-creators, …  |

Subscription status: `none` | `active` | `lapsed`.

- **none:** pricing surfaces; no premium actions.
- **active:** full feature UI and mutations.
- **lapsed:** **keep feature chrome visible; freeze mutations**; renew modal on action.
- **Admin grant:** super admin assigns tier + `subscriptionPeriodEnd`; Stripe webhooks must not wipe active grants. Manage at **Host plan grants** (grant / extend / revoke).

Pricing, VAT, and system-wide discounts are owned by super admin + Stripe (`automatic_tax`, coupon on checkout/renewals).

## Staff plane (sets 5 and 6)

- **Super admin:** all permissions; creates/terminates admins; grants plans; system discount.
- **Admin:** only permissions assigned at creation (`Admin.permissions[]`). Cannot create/delete other admins.
- Routes: `requireSuperadmin` for admin CRUD, grant-plan, system-discount. `requireAdminPermission(key)` for delegated features.
- **Payout operations:** all `/api/v1/{superadmin,admin}/payouts/*` routes require permission key **`payouts`** (superadmin bypasses). Includes settle, force-accept, Connect batch trigger, receipt upload, and ledger reads.

## Tier A — linkage detection alone (no host login)

Reads and affordances only. Uses **tipper JWT** + `requireHostOrPairedTipper`. Never mutates host-owned data; never exposes host-private data.

Frontend: `useHostCapability().canReadAsHost` (active **or** stale linkage).

## Tier B — active host session mandatory

Requires **host-role JWT** in `hostToken`. Stale ⇒ host login modal via `requestHostAuth()`, then resume.

Existing host may re-enter with **password or email code** (`verify-code` accountType HOST). First-time tipper→host **must set a host password**.

Frontend: `useHostCapability().canWriteAsHost` + `serverHostAuthHeaders()` for server actions. Dashboard host writes also require a **server-verified** active host session (`GET /api/auth/host-session?verify=true`); a stale cookie alone does not grant write access.

**Dashboard navigation (one grant per `/host/*` mount):** After the first successful host-session probe, background touch/refresh must **not** unmount dashboard content or reopen the host login modal. Writes remain gated by API `enforce()` + `403 HOST_SESSION_REQUIRED` → modal via `handleAuthRequiredError`.

**Tier B capabilities in `enforce()` catalog:**

| Capability                                            | Scope                                                                   |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `payouts.me.read` / `payouts.me.write`                | Host payout summary, request, settlement ack, Connect status/onboarding |
| `subscriptions.host.me`                               | Host subscription checkout, portal, cancel, tier request                |
| `community.contentBank.*`, `community.host.write`, …  | Community host mutations (existing)                                     |
| `auth.creatorProfile.write`, `auth.hostProfile.write` | Profile mutations (existing)                                            |

**Tier B via host JWT, not yet in `enforce()` catalog:** playlists, TipLinks, co-owners, video-requests, tip config, and other dashboard routes that already use `requireRole("host")` + `serverHostAuthHeaders()`. Treat as Tier B; migrate to named capabilities incrementally. **`npm run verify:hybrid-auth`** asserts those frontend actions still send `serverHostAuthHeaders()` — do not regress to primary tipper token.

**Profile mutations:** `PUT /auth/host-profile` is gated by `enforce("auth.hostProfile.write")`. After Stripe Connect `details_submitted`, legal name / registered company name / account type are **business-rule locks inside** that capability (403 from controller), not a separate auth tier.

**Host money/plan API calls:** always `serverHostAuthHeaders()` (host-role JWT in `hostToken`), never primary tipper token.

**Event tips (Stripe + wallet):** Both paths credit `event_tip` ledger (70% host share) via `recordEventTipLedger` with idempotency key `event_tip_{transactionId}`.

## Tier C — cohost session (7 days, invited event only)

Full parity with owner for event-scoped routes in the invited event. Never dashboard, creator profile, or other rooms.

Frontend: `canManageRoomContent` (host session **or** cohost session for that event).

## Identity issuance (backend)

| Endpoint                                                  | Primary JWT              | Host JWT              | Cohost JWT |
| --------------------------------------------------------- | ------------------------ | --------------------- | ---------- |
| `POST /auth/login-tipper`                                 | tipper 60d (if verified) | —                     | —          |
| `POST /auth/verify-code` (HOST)                           | tipper 60d               | host 7d               | —          |
| `POST /auth/login-host`                                   | tipper 60d               | host 7d               | —          |
| `POST /auth/login-or-register-host`                       | tipper 60d (if verified) | host 7d (if verified) | —          |
| `POST /auth/register-tipper` / `POST /auth/register-host` | — (until verify)         | — (until verify)      | —          |
| `POST /cohost/invite/verify-code`                         | tipper 60d               | —                     | cohost 7d  |
| `POST /visitors/claim-after-payment`                      | visitor (remint)         | —                     | —          |

## Error codes

- `403 { code: "HOST_SESSION_REQUIRED" }` — open host login modal, resume task
- `403 { code: "COHOST_SESSION_REQUIRED" }` — open cohost login modal, resume task
- `403 { code: "SUBSCRIPTION_LAPSED" }` — open renew modal
- `403 { code: "EMAIL_VERIFICATION_REQUIRED" }` — redirect to `/verify-email` with stored email; no session cookies while unverified
- `410 Gone` — visitor session expired; cannot merge activity

## Email verification gate

- `Host.verified` / `Tipper.verified` become `true` only after the existing code flow: code sent → user enters code on `/verify-email` → `POST /auth/verify-code` succeeds.
- `authMiddleware` rejects tipper/host JWTs when `verified === false` (`EMAIL_VERIFICATION_REQUIRED`), unless `AUTH_REQUIRE_VERIFIED=false` (48h kill-switch).
- Exempt from the gate: `POST /auth/session/touch`, `POST /auth/change-email` (recovery while unverified). Touch still returns `verified: false` in the JSON body; the host-session probe maps that to `EMAIL_VERIFICATION_REQUIRED` without clearing cookies.
- Global frontend handler: `EmailVerificationRequiredListener` in `providers.tsx` listens for `tipmanna:email-verification-required` and redirects via `buildVerifyEmailPath`.
- Global detection net: `SessionActivityPinger` reads `verified: false` from gate-exempt `POST /auth/session/touch` and fires the same event (covers legacy in-the-wild tokens).
- Registration does **not** mint JWTs; tokens issue only from `POST /auth/verify-code` (Option C). Frontend stores user identity in Redux with `requiresVerification: true` but persists no cookies until verification completes.
- Cohost access-code acceptance counts as email verification for the linked tipper row (same code-to-email proof).
- Grandfather: run `npm run db:backfill-verified-grandfather` with `VERIFIED_GRANDFATHER_CUTOFF` before enabling the gate in production.
- Deploy with `AUTH_REQUIRE_VERIFIED=false` until staging QA passes; remove the override to enable the gate.

## TV monotonic / visitor identity (clarification)

The TV realtime axis uses a device-scoped tracking key for deduplication and animation sequencing. That key carries **no JWT** and does **not** create a `Visitor`, tipper, or host account. Tracked visitor rows (`Visitor` set 3) are created only after a succeeded payment per the visitor rules above.

## Dashboard host-session probe (fail-closed)

The Next.js route `GET /api/auth/host-session?verify=true` validates `hostToken` via backend `POST /auth/session/touch`.

| Outcome                                                     | Cookies     | Client behavior                                                               |
| ----------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| Valid host session                                          | Refreshed   | `active: true`; writes allowed                                                |
| Invalid/expired session (401 / 403 `HOST_SESSION_REQUIRED`) | **Cleared** | Host login modal                                                              |
| Transient failure (503 / network)                           | **Kept**    | `code: "HOST_SESSION_PROBE_FAILED"` — fail-closed (no writes, no cookie wipe) |

Backend `requireActiveHostSession` increments `hostSessionObs.hostSessionRequired` when a non-host JWT hits a Tier B route.

## Community TV viewer access

**Tipmanna system TV** (`/tv`) is **public**. Viewers do not need Community membership or Community TV entitlement to watch the global schedule.

**Community TV** (`/tv?community=<communityId>`) is **members-only**. Entitlement is enforced **server-side** on protected Community TV viewer APIs and on access-state fields used for bootstrap. The browser gate on the TV page improves UX and fail-closed behavior; it is **not** the security boundary.

### Entitled viewers

| Viewer                                                                               | Entitled                            |
| ------------------------------------------------------------------------------------ | ----------------------------------- |
| Active Community **member** (valid membership row: active, not expired, not revoked) | Yes                                 |
| Community **owner**                                                                  | Yes — even without a membership row |
| **Active co-creator** on the Community                                               | Yes — even without a membership row |

### Denied viewers

| Viewer                                                                | Result |
| --------------------------------------------------------------------- | ------ |
| Anonymous (no primary session)                                        | Denied |
| Authenticated **non-member**                                          | Denied |
| **Visitor** without an entitled tipper identity for membership checks | Denied |
| **Expired** membership                                                | Denied |
| **Revoked** membership                                                | Denied |

### API enforcement

Protected **Community TV viewer** endpoints (schedule, daily TV bootstrap, playlist table, community tip feed, and equivalent native TV-app community schedule reads) call the same entitlement check **independently** of the page gate.

| Caller                      | HTTP                                                                         |
| --------------------------- | ---------------------------------------------------------------------------- |
| Anonymous                   | **401** — sign in required                                                   |
| Authenticated, not entitled | **403** — members only                                                       |
| Entitled                    | Normal success path (after existing Community TV activation / feature rules) |

Authorization error code: **`COMMUNITY_TV_MEMBERS_ONLY`**.

**Global TV** schedule and bootstrap endpoints remain **public** and are **not** wrapped by Community TV membership entitlement.

## Payout dual path (manual default, Connect optional)

Host profile completeness (including gender for individual and organisation owners) gates **payout requests** and Connect batch processing. Field lists and gate behavior: [host-profile-completeness-and-payouts.md](../../product-behaviors/host-profile-completeness-and-payouts.md).

Stripe Connect is an **entitlement/ops path**, not a sixth user set or identity rule.

| Path                   | When                                                                                                   | Flow                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Manual (default)**   | Always available                                                                                       | `PayoutRequest` → admin queue → settle with receipt → host ack → `fulfilled` |
| **Connect (optional)** | `STRIPE_CONNECT_PAYOUTS_ENABLED=true` **and** host `connectPayoutsEnabled` **and** onboarding complete | Monthly/cron batch → Stripe transfer → bank (`payout.paid` notify)           |

Hosts with restricted/KYC-failed Connect accounts remain on the manual path. Production ships manual payouts with Connect **off** until staging transfer succeeds.

**Connect identity (not a sixth user set):**

- First Express account create pre-fills individual name or organisation name from Settings.
- When Stripe reports `details_submitted`, Tipmanna locks legal name fields (`connectLegalNameLockedAt`); other profile fields stay editable.
- **Organisation hosts:** `connectPayoutsEnabled` requires UK sort code + account last4 on Stripe to match organisation profile bank. Mismatch keeps manual payout path; panel shows amber guidance.
- **Individual hosts:** no bank fingerprint check (Stripe collects personal account).

## Machine-readable sources

- Backend: `backend/src/configs/authorization-policy.ts` (`enforce()` factory)
- Frontend mirror: `frontend/src/lib/authorization-policy.ts`
- Admin permissions: `backend/src/configs/admin-permissions.config.ts` (includes `payouts` key)
- Host plan capabilities: `backend/src/configs/host-plan-capabilities.config.ts`
- Verification: `npm run verify:hybrid-auth` (includes payout-admin permission + Tier B payout/subscription routes)
- Ops runbooks: `docs/ops/manual-payout-production-smoke.md`, `docs/ops/stripe-connect-staging.md`, `docs/ops/staging-e2e-runbook.md`
