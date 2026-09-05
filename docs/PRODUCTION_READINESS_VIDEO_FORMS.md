# Production Readiness Report — Video & Event Creation Forms

**Date:** 2026-08-24 (updated 2026-09-03)  
**Scope:** Wizards, add-video modals, Create dialog, form drafts, co-owner invite lifecycle  
**Status:** Ready for production deploy after migration and smoke QA

### 2026-09-03 — Create dialog first-paint + cache

- **Fixed:** Host-link pending is computed during render (`isHostLinkResolutionPending`) so the first Create click never paints the full picker as `status: "none"`.
- **Fixed:** Closing the dialog keeps the host-link cache for the same user; second open can show the prepared view without re-fetching `/auth/me/host-link`.
- **Fixed:** Summarized picker (Create new channel / Add live event) is not blocked on events/communities fetch.
- **Fixed:** Create dialog passes host auth into `AddVideoForm` so draft save and community submit share one host login modal.

### 2026-09-03 — Create dialog Tier A routing

- **Fixed:** Linked tippers no longer flash the full type picker while host linkage probes; prepared view shows after loading settles.
- **Fixed:** Creator-profile **Add live event** opens the summarized picker (Event / Event+Content only), not the full card picker.
- **Fixed:** Host login modal mounted on all create-dialog views (community/co-create submit and draft save).
- **Fixed:** Draft autosave gated on active host session; neutral **“Sign in as host to save drafts”** hint when linked but not signed in as host (Channel tab Tier A submit unchanged).
- **Docs:** [`product-behaviors/PRODUCT_GUIDE_VIDEO_FORMS.md`](../product-behaviors/PRODUCT_GUIDE_VIDEO_FORMS.md) §4 rewritten for view routing, Tier A/B split, and modal vs bridge distinction.

### 2026-09-04 — Create dialog journey + submit hardening

- **Fixed:** **Proceed** sign-in closes the create dialog and navigates to the wizard without a full-picker flash; resume intent stored in refs so sign-in close does not race success handlers.
- **Fixed:** **Sign in as host creator** from the full picker uses a `return-prepared` intent — after auth the prepared view shows (not the full picker).
- **Fixed:** Modal email verification no longer applies Redux sessions before the code step; **Already signed in** banner only when `isAuthenticated`.
- **Fixed:** Host-link refresh prefers in-memory Redux token over stale `visitorToken` cookie fallback.
- **Fixed:** Create POST actions (`createEventChannelAction`, `newCreateEventAction`, `addCommunityVideoAction`) use `maxAttempts: 1` plus in-flight submit locks to prevent duplicate videos.
- **Fixed:** Co-owner invite status GET accepts Tier A tipper JWT (`requireHostOrPairedTipper`); readiness checks **approved-wins** before pending.

### 2026-09-04 (b) — Gap closure

- **Fixed:** Pure resume resolver (`create-dialog-signin-resume.ts`) unit-tested; Proceed never reopens full picker.
- **Fixed:** `exclusive-submit` helper locks wizard, create-dialog, and add-video submits before first `await`.
- **Fixed:** Backend `classifyCoOwnedInvites` mirrors frontend approved-wins (pending siblings ignored when approved exists).
- **Fixed:** Page signup (`signup-form.tsx`) no longer applies sessions before email verify (Option C alignment).
- **Tests:** `getAuthToken.spec.ts` for visitor-cookie fallback rules.

---

## Executive summary

All audit gaps are closed, including the **Maximum update depth exceeded** infinite render loop on co-owner forms. Co-owner submit readiness uses an **approved-wins** policy with **drop-on-submit** for terminal-only videos on multi-video wizards. Single-video modals block with actionable messaging instead of dropping.

**Deploy blockers (must run once per environment):**

1. `npx prisma migrate deploy` — applies `20260822100000_video_co_owner_invite_resend`
2. Confirm cron workers are running (includes `form-draft-purge` at 04:25 UTC daily)
3. Run manual QA checklist below on staging before production

---

## Critical fix: infinite render loop (Phase 0)

**Symptom:** `Maximum update depth exceeded` when selecting co-owned ownership on wizard step 4, add-video modal, and community bank form.

**Root cause:** Hydration effect in `use-coowner-draft-fields.ts` depended on `lifecycleReady` while also calling `setCoOwnerHydrating()`, which toggled `lifecycleReady` — a self-triggering cycle.

**Fix:** Lifecycle provider now exposes `restoreReady` (unaffected by hydration) for co-owner effects; autosave continues to use full `lifecycleReady`.

---

## Audit scenario closure

| #    | Scenario                                        | Resolution                                                              |
| ---- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Co-owner invite expires while draft open        | Lazy expiry + cron sweep; **Expired** status + **Resend**               |
| 2    | Duplicate invite for same email/draft           | 409 `invite_resendable` with `inviteId`; resend affordance              |
| 3    | Resend spam                                     | Server cooldown + max count; UI countdown after resend response applied |
| 4    | Submit with pending invite                      | Blocked client + server                                                 |
| 4b   | Stale declined/expired + newer approved         | **Approved-wins:** submit allowed; stale rows ignored                   |
| 4c   | Terminal-only co-owned video on wizard          | **Dropped** from submission; host warned pre-submit                     |
| 4d   | Terminal-only on single-video modal             | **Blocked** with resend/remove/ownership message                        |
| 5    | YouTube verify bypass                           | Submit disabled until verified                                          |
| 6–11 | Drafts, verify persistence, public expiry, etc. | As prior pass (verified in code + tests)                                |
| 12   | Infinite render loop on co-owner toggle         | **Fixed:** `restoreReady` decoupling                                    |
| 13   | Resend dead-end (no activeInvite)               | **Fixed:** synthetic row on 409                                         |
| 14   | Revoked resend loop                             | **Fixed:** revoked allowed in resend                                    |
| 15   | No Remove control                               | **Fixed:** revoke API wired; Remove button in UI                        |
| 16   | P2002 without inviteId                          | **Fixed:** duplicate row lookup                                         |

---

## Submit policy (confirmed)

Per co-owned video link:

- **Approved invite present:** video submits; stale terminal rows on same draft key ignored
- **Pending:** blocked
- **Terminal only (expired/declined/revoked):** wizard drops video; modal blocks
- **Remove button:** clears pending/expired/declined invites via revoke endpoint

Wizard create responses include `excludedVideos: [{ title, reason }]`.

---

## Test coverage (verified)

### Frontend

- `coowner-submit-readiness.util.spec.ts` — approved-wins, will_drop
- `coowner-draft-submit.util.spec.ts` — wizard vs single-video validate paths
- `create-dialog-signin-resume.spec.ts` — Proceed / return-prepared / add-video resume
- `getAuthToken.spec.ts` — visitor fallback vs signed-in roles

### Backend

- `event-create-coowner-partition.spec.ts` — partition + default promotion
- `invite-expiry.service.spec.ts`, `formDraftPurge.spec.ts`

---

## Manual QA checklist

- [ ] Wizard step 4: ownership **No** — no console loop; one status fetch per draft key
- [ ] Declined invite + new approved invite — wizard submit succeeds
- [ ] Terminal-only co-owned video on wizard — warning shown; video excluded; toast lists excluded titles
- [ ] Single-video modal with terminal invite — submit blocked with actionable message
- [ ] Resend — cooldown starts immediately after success (no second 429)
- [ ] Remove — clears stale invite; form returns to editable state
- [ ] Revoked duplicate on create — resend works (not error loop)
- [ ] Proceed (visitor) → sign-in → wizard with **no full-picker flash**
- [ ] Full picker “sign in as host creator” → prepared view after auth
- [ ] Channel tab: approved + pending sibling invites → submit succeeds (one POST)
- [ ] Wizard final submit: double-click → one POST only

---

## Documentation

- Product guide: [product-behaviors/PRODUCT_GUIDE_VIDEO_FORMS.md](../product-behaviors/PRODUCT_GUIDE_VIDEO_FORMS.md)

---

## Sign-off

| Area                                    | Status |
| --------------------------------------- | ------ |
| Infinite render loop                    | ✅     |
| Co-owner lifecycle (send/resend/remove) | ✅     |
| Submit readiness (approved-wins + drop) | ✅     |
| Draft persistence                       | ✅     |
| YouTube gating                          | ✅     |
| Tests                                   | ✅     |
