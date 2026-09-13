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

- **Fast load:** public `/l/{slug}` RSC waits on `GET /tiplinks/:slug` which includes landing fields, the published **strip** (comment → elite IDs → section → drawerItems fill, max 20), and `tipConfig` (CTA + layout). Legacy events load comment-only on first paint (no full catalog). No heavy metrics on this request. Stripe.js loads only when the tip drawer opens.
- Tip strip stays at the top (not player-first).
- Portrait mobile scroll is unlocked; document overflow locks only in Enlarge (mobile full-view/landscape or web enlarge).
- Sticky header is a compact two-row glass stack: nav row (Create Yours, profile, text wordmark tipmanna + link) plus metrics ticker row. Ticker stays mounted during **all** Enlarge modes (mobile and web). Header wordmark is text (not an image); mobile/phone-landscape uses `text-lg` + matching `link`; true desktop uses `text-2xl` + matching `link` — sizes do not change on Enlarge.
- Page has a single `h1`: the video title. Brand wordmark is not an `h1`.
- Ticker shows `{visits} visits · {tips} tips · {shares} shares · Watch · {sectionCtaLabel|Engage} · Support` in normal scroll (continuous LTR marquee; static fallback on `prefers-reduced-motion`). During Enlarge, ticker keeps visits/tips/shares only — **Watch · {sectionCtaLabel|Engage} · Support** labels are hidden.
- Footer `Watch · {sectionCtaLabel|Engage} · Support` is label-only text; it does not open the tip drawer. Footer is **hidden** during Enlarge (landscape, portrait, desktop).
- When the inline player scrolls out of view, the same VideoPlayer instance docks into a 16:9 pip slot on the right of the ticker row (96×54 mobile, 128×72 desktop); tap pip scrolls back to inline (dedicated tap target above header on mobile). Player uses always-`fixed` measured rects (inline / dock / enlarge) — no iframe remount on iOS.
- Spotify-style orange-on-black page background; pitch heading uses host first name (`{firstName}'s Pitch`).
- Store grid first row: **Tipmanna Explore / ENGAGE** opens `/explore?feedTab=trends&channel={channelId}&eventId={eventId}&from=tiplink` in a **new tab** (standard Explore reel UI). Handoff stashes a playable channel snapshot and `stayInExploreReel` in **localStorage** (sessionStorage mirror for same-tab) so the new tab gets first-paint reel data, does not bounce to the channel client, and swipe-down continues the normal Trends reel from index 1.
- Guest **Save** and **Subscribe** open tipper `SignInDialog` (`signupSurface="tiplink"`) and complete save-video / save-host after successful sign-in.
- Pitch is a composed card (heading, banner/thumbnail, text).
- YouTube iframe is non-interactive (`pointer-events-none`); play/pause uses app chrome only (no click-through to YouTube).
- Country flag appears **before the video title** (channel country, then event country).
- **About this video** (Info icon, top-right of the player) opens a drawer with description, subscribe-to-host, and Close. Visible in inline and Enlarge; hidden when PiP-docked.
- **Close** enlarged video: X on the player at top-left (opposite Info), not in the header. Portrait mobile Enlarge keeps the normal header (no header Close).
- Single **Enlarge** control (Maximize) on the inline player — no secondary layout-toggle icon.
- Mobile landscape auto-Enlarge: compact ticker at top (metrics only); seek + scrubber CTA overlaid on the video (no title band, no page footer).
- Web **Enlarge** uses ticker-at-top + on-video overlay scrubber (not a separate full-bleed overlay or bottom band). Desktop scrubber CTA uses larger pill sizing.
- TipSection **Engage/Gift** CTA is centered in the strip middle column (label length does not shift the button slot).

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
- **Private community bank:** approved community-bank videos with `visibility: private` cannot create, rebind, publish, or serve a public `/l/{slug}` (member-only content).
- **Publish + public GET:** video must be admin-approved; otherwise publish is blocked and `/l/{slug}` returns 404.

## SEO

- Published `/l/{slug}`: indexed (`robots: index`), canonical, OG/VideoObject JSON-LD (banner or YouTube thumbnail).
- Draft preview `/l/preview/{id}`: `noindex`.

## Creator profile Create TipLink

- **Create TipLink** on All Videos and List opens a video picker (eligible host videos without an existing TipLink).
- Empty picker: host must add a video first; no dashboard redirect.
- On select: `POST /host/tiplinks` draft (shows “Creating TipLink draft…” while in flight); host is switched to profile **List** tab when created from another tab (stays on List if already there); draft row shows **Complete** immediately via optimistic insert.
- **Complete** requires host auth and opens manage-event TipLink tab for that draft (`?tab=tiplink&channelId=`).
- Dashboard auto-opens the existing draft in the edit form when a TipLink already exists for `channelId`.

## Banner display

- List tab and published rows prefer custom `bannerUrl` over YouTube `hqdefault`.
- `bannerAspect`: `landscape` (default) or `square` — host picks in manage-event form; landing pitch media uses matching aspect.

## Video tip reminders

- TipLink public payload includes `channel.reminders`.
- TipLink uses the shared video tip reminder engine (flash + in-app). See `docs/video-tip-reminder-product-behavior.md`.
