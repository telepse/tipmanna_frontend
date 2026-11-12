# Identifier reconciliation — manual captures (correct fixture, 2026-11-12)

**Sources:** `tiplink-manual-acceptance-public-2026-11-12.json`, `tiplink-manual-acceptance-preview-2026-11-12.json`

## Shared fields across public and preview

| Field | Public | Preview | Reconciliation |
|-------|--------|---------|----------------|
| `sessionId` | `ee02fd56-99f1-4a34-be39-5d38ceb8c12e` | **same** | **Ambiguous** — see below |
| `eventId` | `01a4b10b-f80d-43e8-a78b-5f872e6c353e` | **same** | **Expected** — single acceptance TipLink / event |
| `videoChannelId` | `7fc7b429-c7b1-42bf-a1bf-954b36b20150` | **same** | **Expected** — registry channel |
| `encounterItemId` | `tiplink-ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea` | **same** | **Expected** — slug-derived id |
| `activationId` | *not in payload extracts* | *not in payload extracts* | **NOT REQUIRED** for Test01 acceptance procedure (see below) |

## `sessionId` shared across flows

**Plausible expected explanation:** Both captures were taken in the **same browser profile** without clearing `sessionStorage` (`tipmanna-analytics-session`). The SDK reuses one analytics session across navigations (public → preview). That is **consistent with product behavior** and does **not** by itself invalidate the captures.

**Alternative explanation:** If the programme required **statistically independent** cold-start sessions per surface, a shared `sessionId` means the two captures are **one continuous session**, not two independent acceptance runs. That would require explicit Product/QA scope to judge **FAIL** on independence grounds.

**Disposition:** **VALID for same-session programme**; **NOT VERIFIED for independent-session requirement** until scope is stated or a second capture with a fresh session is filed.

## Timestamp ordering

Preview client timestamps (`1794477817349` … `1794477856551`) precede public (`1794478023633` … `1794478082059`), consistent with **preview first, then public** in one browser session.

## `activationId`

The registry **Acceptance procedure** (steps 1–3) requires page load, play ≥10s, and `POST …/tv/analytics` with `v: 2` and `surface: "tiplink"`. Step 4 (optional DB trace) does **not** mandate `activationId`. SDK types treat `activationId` as optional.

**Disposition:** **Non-blocking evidence limitation** — not filed in payload extracts; does not block Test01 technical acceptance unless a future programme addendum requires it.

## Programme scope (independence)

**Product/QA authorization** ([`product-qa-authorization-2026-11-12.md`](./product-qa-authorization-2026-11-12.md)) authorizes controlled playback on **both** public and host-preview against the pinned deployment; it does **not** require independent cold-start `sessionId` per surface.

**Final disposition (2026-11-12):** Shared `sessionId` is **accepted** for Test01 — single browser session, preview then public.
