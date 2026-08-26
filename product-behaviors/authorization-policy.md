# Authorization Policy — Six User Sets

**Last aligned:** 2026-08-25 (tipper-primary identity + hybrid tiers + staff plane + plans)

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
- **admin_grant:** super admin assigns tier + `subscriptionPeriodEnd`; Stripe webhooks must not wipe active grants.

Pricing, VAT, and system-wide discounts are owned by super admin + Stripe (`automatic_tax`, coupon on checkout/renewals).

## Staff plane (sets 5 and 6)

- **Super admin:** all permissions; creates/terminates admins; grants plans; system discount.
- **Admin:** only permissions assigned at creation (`Admin.permissions[]`). Cannot create/delete other admins.
- Routes: `requireSuperadmin` for admin CRUD, grant-plan, system-discount. `requireAdminPermission(key)` for delegated features.

## Tier A — linkage detection alone (no host login)

Reads and affordances only. Uses **tipper JWT** + `requireHostOrPairedTipper`. Never mutates host-owned data; never exposes host-private data.

Frontend: `useHostCapability().canReadAsHost` (active **or** stale linkage).

## Tier B — active host session mandatory

Requires **host-role JWT** in `hostToken`. Stale ⇒ host login modal via `requestHostAuth()`, then resume.

Existing host may re-enter with **password or email code** (`verify-code` accountType HOST). First-time tipper→host **must set a host password**.

Frontend: `useHostCapability().canWriteAsHost` + `serverHostAuthHeaders()` for server actions.

## Tier C — cohost session (7 days, invited event only)

Full parity with owner for event-scoped routes in the invited event. Never dashboard, creator profile, or other rooms.

Frontend: `canManageRoomContent` (host session **or** cohost session for that event).

## Identity issuance (backend)

| Endpoint                             | Primary JWT      | Host JWT | Cohost JWT |
| ------------------------------------ | ---------------- | -------- | ---------- |
| `POST /auth/login-tipper`            | tipper 60d       | —        | —          |
| `POST /auth/verify-code` (HOST)      | tipper 60d       | host 7d  | —          |
| `POST /auth/login-host`              | tipper 60d       | host 7d  | —          |
| `POST /auth/login-or-register-host`  | tipper 60d       | host 7d  | —          |
| `POST /cohost/invite/verify-code`    | tipper 60d       | —        | cohost 7d  |
| `POST /visitors/claim-after-payment` | visitor (remint) | —        | —          |

## Error codes

- `403 { code: "HOST_SESSION_REQUIRED" }` — open host login modal, resume task
- `403 { code: "COHOST_SESSION_REQUIRED" }` — open cohost login modal, resume task
- `403 { code: "SUBSCRIPTION_LAPSED" }` — open renew modal
- `410 Gone` — visitor session expired; cannot merge activity

## Machine-readable sources

- Backend: `backend/src/configs/authorization-policy.ts` (`enforce()` factory)
- Frontend mirror: `frontend/src/lib/authorization-policy.ts`
- Admin permissions: `backend/src/configs/admin-permissions.config.ts`
- Host plan capabilities: `backend/src/configs/host-plan-capabilities.config.ts`
- Verification: `npm run verify:hybrid-auth`
