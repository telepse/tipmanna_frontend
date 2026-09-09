# TipLink product behavior

TipLink is a public landing surface at `/l/{slug}` tied to one EventChannel video. It is a live Tipmanna room (tips, preview animations, payment animations) — not a static store-link page.

## Create gating

- First TipLink create is free (`Host.tipLinksCreatedCount === 0`).
- `tipLinksCreatedCount` increments on draft create and **never decrements** on delete.
- Second and later creates require active Host Growth or Community subscription.

## Authorization

| Action                              | Tier                                    |
| ----------------------------------- | --------------------------------------- |
| Public GET `/api/v1/tiplinks/:slug` | Unauthenticated                         |
| POST `/api/v1/tiplinks/:slug/visit` | Unauthenticated                         |
| Host CRUD `/api/v1/host/tiplinks/*` | Tier B (`hostToken` + `requireHost`)    |
| Preview `/l/preview/[id]`           | Tier B (host session via server action) |

Frontend host mutations use `serverHostAuthHeaders()` in `frontend/src/actions/tiplink.ts`.

## Payment surface

- `PaymentSurface.tiplink` is additive.
- Tips require `paymentContentId` (EventChannel id), same as content-client.
- Animation delivery uses existing `global-live-tv` / `tip-animation` pipeline filtered by `eventId` only.

## Page visits

- `PageVisitEntityType.tiplink` records visits on the TipLink entity id.
- Do not substitute video encounter counts for TipLink page visits.
- Optional `PageVisit.countryCode` (ISO-2) is set from `cf-ipcountry` or `x-vercel-ip-country` on the visit POST when present.
- Host TipLink summaries include `visits90d`, `visits7d`, `visits24h`, and top 5 countries (90d) on manage-event lists only.

## Landing UX

- Tip strip stays at the top (not player-first).
- Portrait mobile scroll is unlocked; document overflow locks only in full-view, desktop Enlarge overlay, or device landscape.
- Sticky header is a two-row glass stack: nav row (Create Yours, profile, logo) plus metrics ticker row.
- Ticker shows `{visits} visits · {tips} tips · {shares} shares · Watch · Engage · Support` (continuous LTR marquee; static fallback on `prefers-reduced-motion`).
- When the inline player scrolls out of view, the same VideoPlayer instance docks into a 16:9 pip slot on the right of the ticker row (96×54 mobile, 128×72 desktop); tap pip scrolls back to inline. No third collapsing header row; no iframe remount.
- Spotify-style orange-on-black page background; pitch heading uses host first name (`{firstName}'s Pitch`).
- Store grid includes a Tipmanna **ENGAGE** row linking to the creator profile.
- Pitch is a composed card (heading, banner/thumbnail, text).
- YouTube iframe is non-interactive (`pointer-events-none`); play/pause uses app chrome only (no click-through to YouTube).
- Country flag overlays the player (channel country, then event country — same as explore).
- Desktop **Enlarge** opens a fixed black-room overlay (landscape cover); mobile Enlarge uses existing full-view hook.

## Host video rebind

- PATCH `/api/v1/host/tiplinks/:id` accepts optional `eventChannelId` to point an existing TipLink at another video in the **same event**.
- Target must be host-owned, not deleted, and must not already have another TipLink (409).
- Published TipLinks require the target to pass publish eligibility; drafts use draft eligibility.
- Does not increment `tipLinksCreatedCount`.
- When `bannerSource === thumbnail`, banner refreshes from the new video YouTube thumbnail.
- Host manage-event form exposes a video picker when multiple eligible videos exist.

## Create Yours funnel

- Header/footer **Create Yours** starts the content-only wizard (`/content-only`), not the TipLink form.
- Guests use `SignInDialog` with `signupSurface="create_dialog"` and `intent: type-picker-proceed` (see `startContentOnlyCreateJourney` + `resolveCreateDialogSignInSuccess`).

## Title and description

- Display always reads `EventChannel.title` / `EventChannel.description` (no override columns on the landing page).
- Host TipLink form edits the channel title/description via PATCH (same fields as manage-event contents).

## Draft vs publish eligibility

- **Draft create/update:** host-owned video, not deleted/rejected; unapproved videos may draft.
- **Publish + public GET:** video must be admin-approved; otherwise publish is blocked and `/l/{slug}` returns 404.

## SEO

- Published `/l/{slug}`: indexed (`robots: index`), canonical, OG/VideoObject JSON-LD (banner or YouTube thumbnail).
- Draft preview `/l/preview/{id}`: `noindex`.
