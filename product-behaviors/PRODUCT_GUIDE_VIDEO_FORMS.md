# Product Guide — Video & Event Creation Forms

**Audience:** Product, support, and engineering teams  
**Last updated:** 2026-09-03

This guide describes **what users see and what the system does** for every form involved in creating events, adding videos, and co-owner invitations. Use it for support tickets, QA, and feature discussions.

---

## Overview

Tipmanna has two families of creation flows:

1. **Full wizards** — multi-step flows that create a new channel (content-only, event-only, or combined).
2. **Add-video modals** — single-form flows that add a video to an **existing** event room or community.

Both families share:

- **Draft autosave** (host session required)
- **YouTube channel verification** (when host claims ownership on their YouTube channel)
- **Co-owner invitations** (when host does not sole-own the video)

---

## Draft system (all forms)

### Draft kinds

| Kind                | Used by                                                  |
| ------------------- | -------------------------------------------------------- |
| `content_only`      | Content-only wizard                                      |
| `event_only`        | Event-only wizard                                        |
| `event_and_content` | Event + content wizard                                   |
| `room_add_video`    | Event room add-video modal                               |
| `community_video`   | Community add-video modal + Create dialog community tabs |

### How autosave works

- Saves automatically ~1.5 seconds after the user stops typing (**active host write session** required — Tier B).
- When the user is linked but has no active host session, add-video surfaces show **“Sign in as host to save drafts”** instead of autosaving or showing an error. **Save to draft** opens the host login modal.
- Each save extends **TTL by 30 days**.
- **Policy data** (ownership answers, co-owner draft keys, YouTube verify state) is stored separately from plain form fields so sensitive invite state is not lost.
- Expired drafts are hidden from the list and purged nightly by cron.

### How resume works

| Surface           | UX                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Wizards**       | Yellow **Resume/Discard** banner when a recent in-progress draft exists. User must choose. URL `?draftId=` also restores directly. |
| **Modals**        | Silent restore when the modal opens (toast: “Draft restored”). Dashboard **Saved drafts** panel provides resume buttons.           |
| **Create dialog** | Same as modals; can also resume via URL params (`resumeCreateVideo=1`, etc.).                                                      |

### Dashboard — Saved drafts panel

Located on the host dashboard (`/host/{slug}`).

- Shows title, form type, step number, last updated.
- **Resume** navigates to the correct surface with draft ID in URL.
- **Delete** removes the server draft permanently.

---

## 1. Content-only wizard

**URL:** `/content-only`  
**Entry:** Create dialog → “Content only”, or dashboard draft resume

### Steps

| Step | Name             | Key fields                                                                                                   |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | Target           | Fundraising target amount                                                                                    |
| 2    | Content          | Event type, contribution type, one or more videos (URL, title, description, language, country, default flag) |
| 3    | Room             | Creator identity, live stream link, tip usage disclosure — or sign-in form if not yet a host                 |
| 4    | Privacy & policy | YouTube slots, ownership per video, co-owner invites                                                         |

### Step navigation rules

- **Next** on step 2 requires at least one video, exactly one marked default, and valid embeddable YouTube URLs.
- **Next** on step 3 requires live video link and tip usage disclosure selections.
- **Submit** on step 4 runs privacy + co-owner checks.

### YouTube verification (step 4)

For each video where the host answers **“Yes, I own this on my YouTube channel”** and selects **slot 1 or 2**:

1. User clicks **Verify on YouTube channel**.
2. System checks the video appears on the host’s linked YouTube channel.
3. Submit stays disabled until verification succeeds.

If ownership is **“No”** (co-owned), YouTube slot verification is replaced by the co-owner invite flow.

### Co-owner flow (step 4)

When ownership = **No**:

1. Host enters co-owner legal name, email, and revenue share %.
2. Host clicks **Send invitation** (requires **Host Growth (Premium)** or **Host Community** tier; subscription must be **active**, not lapsed).
3. Co-owner receives email with link to `/co-owner/invite/{token}`.
4. Until co-owner **approves**, the wizard **cannot be submitted**.
5. Status badges: Pending → Approved / Declined / Expired / Revoked.
6. **Resend invitation** available for expired/declined/pending invites (10-minute cooldown, max 5 resends).

**Important:** Toggling ownership back to “Yes” preserves the pending invite server-side until submit; switching away does not auto-revoke until the host submits as sole owner.

### Submit outcome

- **Success:** Toast “Content created successfully”, draft deleted, redirect to host profile dashboard.
- **Failure:** Field-level errors from server; co-owner blocking reasons shown inline.

### Who can use it

- Anyone can browse early steps.
- Draft save, YouTube tools, and submit require **signed-in host with write access**.
- Users tagged as existing hosts on step 3 may see a restricted path — they use add-video modals instead.

---

## 2. Event-only wizard

**URL:** `/event-only`  
**Entry:** Create dialog → “Event channel”

Same 4-step pattern as content-only, with these differences:

### Step 2 — Event + videos

Additional event fields: physical location, venue, date/time/timezone, event banner, performers/sessions structure begins here.

### Step 3 — Organiser room

Event name, host name, activities, resources, performers, sessions, cohosts, live stream link.

### Submit

- Creates an **event channel** (not content-only).
- Success toast: “Event added successfully”.
- Event banner uploaded to Cloudinary if provided.

Draft kind: `event_only`. Privacy/co-owner/YouTube rules identical to content-only step 4.

---

## 3. Event and content wizard

**URL:** `/event-and-content`  
**Entry:** Create dialog → “Event and Content channel”

Combines event metadata (step 2) with content/video fields and uses the same privacy step.

Draft kind: `event_and_content`. All co-owner and YouTube rules match the other wizards.

---

## 4. Create dialog (quick add-video)

**Entry points:** Navbar, footer, Explore, creator profile, dashboard

Requires `NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED=true`.

### View routing (which screen users see)

The dialog resolves to one of four views:

| View                  | Who sees it                                                                                   | What it shows                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Loading**           | Signed-in non-visitor while host link / targets are probing                                   | Spinner — “Checking your host session…”                                           |
| **Prepared view**     | Linked tipper (Tier A read: active or stale host link)                                        | Existing rooms + **Create new channel** + Channel / My community / Co-create tabs |
| **Summarized picker** | User chose **Create new channel**, or creator-profile **Add live event** (`entry=event-room`) | Compact list: option title + subtitle (no “Suitable for…” sublabels)              |
| **Full picker**       | Visitors, tipper-only (no host link), or community feature off                                | Three cards with title, subtitle, and “Suitable for…” role text                   |

Linked tippers **never** see the full picker while host linkage is still loading.

### Full picker (Mode A)

Shows three cards:

- Content only → `/content-only`
- Event channel → `/event-only`
- Event and Content → `/event-and-content`

**Proceed** for non-logged-in users and visitors opens the **sign-in/sign-up modal** (`SignInDialog` with inline sign-up). On success the create dialog **closes** and the user lands on the chosen wizard route — no full-picker flash. This is **not** the wizard step-3 **bridge** (`EventSignInForm`).

The **“sign in as host creator”** link on the full picker uses a separate resume intent: after auth the dialog stays open on the **prepared view** (existing rooms + tabs), not the full picker.

Modal email verification does **not** show “Already signed in” until the code step completes (`isAuthenticated`).

Logged-in tippers without a host link proceed directly into the wizard and meet the bridge at step 3 if they need to sign up as a host.

### Summarized picker

Reached via:

- **Create new channel** button inside the prepared view
- Creator profile → Events tab → **Add live event** (`entry=event-room`)

Shows option **title + subtitle** only (no “Suitable for content creators / event organizers / charity and event” sublabels). **Continue** routes to the full wizard for the selected type.

For `entry=event-room` only, **Content only** is disabled; **Event channel** and **Event and Content channel** remain clickable. Other journeys (including **Create new channel** from the prepared view) keep all three options enabled.

### Prepared view (Mode B — linked tipper, Tier A read)

Title: **Add a video**. For tippers with a detected host link (active or stale host session).

| Tab              | Target               | Submit action                  | Draft kind        | Auth tier                                               |
| ---------------- | -------------------- | ------------------------------ | ----------------- | ------------------------------------------------------- |
| **Channel**      | Existing event room  | Creates event channel video    | `room_add_video`  | Tier A (tipper JWT + `X-Create-Surface: create_dialog`) |
| **My community** | Owned community      | Adds to community content bank | `community_video` | Tier B (active host session)                            |
| **Co-create**    | Co-creator community | Same as community              | `community_video` | Tier B (active host session)                            |

**Create new channel** opens the summarized picker and then the full wizard on Continue.

#### Form fields (all tabs)

- Title, description, YouTube URL
- Content language & country
- Event video type (or inherit from event)
- Host YouTube slot (1 or 2) — optional
- Ownership question + co-owner fields
- Live stream toggle, reminder settings

#### Co-create tab difference

- Co-owner policy mode is **owner only** — the “No, co-owned” ownership option is **hidden**. Co-creators cannot submit co-owned videos to a community bank they do not own (server enforces this even if the UI were bypassed).

#### Draft behavior

- **Silent autosave** with save indicator when an **active host session** exists.
- Without host session: neutral **“Sign in as host to save drafts”** hint; **Save to draft** opens host login modal.
- Restores automatically when dialog reopens (host session required to persist new saves).
- Dashboard drafts panel can reopen the dialog with stored target + tab.

#### Submit

- **Channel tab:** `createEventChannelAction` with `fromCreateDialog: true` — works with tipper JWT when user owns the event (Tier A).
- **Community tabs:** `addCommunityVideoAction` with host session — opens host re-authentication modal if session is stale.
- Auth errors open host re-authentication modal.

---

## 5. Event room — add video modal

**Entry:**

- Event room → Settings (gear) → Content room settings → “Add videos to room channel”
- Dashboard draft resume → `/room/{eventId}?openAddVideo=1&modalDraftId={id}`

**Who can open:** Event owner or cohost.

Uses the same `AddVideoForm` as the Create dialog with:

- Draft kind: `room_add_video`
- Full co-owner policy (not owner-only)
- YouTube verification when slot selected

**Submit:** Creates video on the event channel; clears draft on success.

---

## 6. Community — add video modal

**Entry:**

- `/host/{slug}/host-community` → “Add video”
- Dashboard draft → `?communityId=&modalDraftId=`

**Who can open:** Signed-in host with community access.

- Draft kind: `community_video`
- Full ownership toggle and co-owner invite flow
- Same YouTube verification rules

**Submit:** Adds video to community content bank (may enter moderation queue depending on community settings).

---

## 7. Co-owner public invite page

**URL:** `/co-owner/invite/{token}`  
**Auth:** None required (public page)

### What the co-owner sees

- Host name, video/content title, proposed revenue share
- Current invite status and expiry

### Actions (pending invites only)

1. **Email me a code** — sends OTP to co-owner email
2. Enter OTP → **Approve** or **Decline**

### After decision

- **Approved:** Host’s form unlocks for submit (real-time via Pusher on host side)
- **Declined / Expired:** Host must fix or resend invitation
- Non-pending states show read-only message

### Security notes

- OTP required for approval (possession of email)
- Invite token rotates on resend; old links stop working
- YouTube URL at invite time binds consent to specific video

---

## YouTube verification — unified rules

Applies to **wizards (step 4)** and **all add-video modals**.

| Condition                     | Requirement                                |
| ----------------------------- | ------------------------------------------ |
| Ownership = Yes + slot 1 or 2 | Must verify before submit                  |
| Ownership = No (co-owned)     | Co-owner invite required instead           |
| Slot = none                   | No YouTube verify required                 |
| Verify in progress            | Submit disabled, button shows “Verifying…” |
| Verify failed                 | User must fix URL/slot and retry           |

**Modal drafts** persist verify state (`checking`, `verified`, `failed`) so users don’t lose progress when closing the dialog.

---

## Co-owner invitations — unified rules

| Rule               | Behavior                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier               | **Host Growth (Premium)** or **Host Community** required to send invites. Community includes all Growth capabilities. Subscription must be **active** (lapsed plans freeze invite mutations). |
| Co-create bank     | Co-creators **cannot** submit co-owned videos to a community they co-create; only the community owner can add co-owned videos to their own bank.                                              |
| YouTube URL        | Required when sending invite (server validates)                                                                                                                                               |
| Submit gate        | Blocked while invite is **pending** or no invite sent yet                                                                                                                                     |
| Approved-wins      | If an **approved** invite exists, stale expired/declined/revoked **and pending** sibling rows on the same draft are ignored                                                                   |
| Wizard drop        | Co-owned videos with **only** terminal invites are **excluded** from submission (warning shown pre-submit)                                                                                    |
| Single-video modal | Cannot drop the only video — submit blocked with resend/remove/switch-to-full-ownership guidance                                                                                              |
| Default video      | Cannot mark as default while co-owner invite pending                                                                                                                                          |
| Resend             | Available for pending/expired/declined/revoked; 10 min cooldown; max 5                                                                                                                        |
| Remove             | Clears pending/expired/declined invites; pending requires confirmation                                                                                                                        |
| Approval           | Co-owner uses public page + email OTP, not in-app login                                                                                                                                       |
| Real-time          | Host UI refreshes on approval/resend via Pusher                                                                                                                                               |

### Status meanings (host UI)

| Status   | Meaning                                        | Host action                                                |
| -------- | ---------------------------------------------- | ---------------------------------------------------------- |
| Pending  | Awaiting co-owner approval                     | Wait or resend after expiry                                |
| Approved | Co-owner consented                             | Can submit                                                 |
| Declined | Co-owner rejected                              | Resend to same email or **Remove** and invite someone else |
| Expired  | Invite timed out                               | Resend invitation or **Remove**                            |
| Revoked  | Host removed invite or submitted as sole owner | Resend if still co-owned                                   |

---

## Auth requirements summary

| Action                                  | Requirement                                       |
| --------------------------------------- | ------------------------------------------------- |
| Browse wizard steps 1–2                 | None                                              |
| Save draft                              | Host write session                                |
| YouTube verify                          | Host write session                                |
| Send co-owner invite                    | Host write session + Growth or Community (active) |
| Submit wizard                           | Host account, verified, not visitor               |
| Add video — Channel tab (create dialog) | Tier A: linked tipper owns event                  |
| Add video — community / co-create tabs  | Tier B: active host session                       |
| Add video — event room modal            | Tier B/C: event owner/cohost                      |
| Co-owner approve                        | Email OTP on public page                          |

---

## Support quick reference

**“My draft didn’t save”**  
→ User must be signed in as host. Check dashboard Saved drafts. Wizards show resume banner.

**“Submit button greyed out”**  
→ Check YouTube verify status OR co-owner invite status (pending, or terminal-only on single-video modal).

**“Video missing after wizard submit”**  
→ Co-owned video had no approved invite and was auto-excluded. Check the post-submit toast for excluded video names.

**“Co-owner approved but still blocked”**  
→ Wait for Pusher refresh (~seconds) or change a field to trigger revalidation. Check invite matches current YouTube URL.

**“Resend button disabled”**  
→ 10-minute cooldown after last resend, or max 5 resends reached.

**“Old invite link doesn’t work”**  
→ Token rotates on resend; co-owner must use latest email.

**“Sign in as host to save drafts” on create dialog**  
→ User is linked as host but has no active host session. Channel submit may still work (Tier A). Sign in as host to autosave, or use **Save to draft** to open host login.

---

## Related documentation

- [Production Readiness Report](../docs/PRODUCTION_READINESS_VIDEO_FORMS.md) — deploy checklist, technical closure of audit items
