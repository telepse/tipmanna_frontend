# TipLink Test01 — fixture reconciliation (2026-11-12)

**Deployment (unchanged):** `dpl_8qjMR2N4Xcvpa257rSXVN1VU5ZY9` @ `2267ee6` — immutable `https://tipmanna-testing-g0hjhjlep-telepse-companys-projects.vercel.app`

## Summary

Browser captures reported **valid TipLink v2 analytics** (`v: 2`, `surface: "tiplink"`, `video_encounter`, `video_start`) but identifiers match a **different published TipLink** (Brahman factory video / Wave 3 overlay channel), **not** the registry acceptance fixture (Ronaldo).

**Acceptance on the agreed fixture:** **FAIL** (wrong content) until both flows are re-run on the approved routes with HAR proof.

**Analytics pipeline shape:** **PASS** (surface + schema on whatever page was played).

## Approved fixture (registry)

| Field | Value |
| --- | --- |
| TipLink ID | `07e18a5a-5c75-4665-b321-f0fe294b1809` |
| Slug | `ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea` |
| Channel ID | `7fc7b429-c7b1-42bf-a1bf-954b36b20150` |
| Expected `itemId` | `tiplink-ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea` |
| Public route | `/l/ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea` |
| Preview route | `/l/preview/07e18a5a-5c75-4665-b321-f0fe294b1809` |

Staging API `GET /tiplinks/{slug}` **200** — IDs match (2026-11-12).

## Observed in reported analytics (both flows)

| Field | Observed | Maps to staging TipLink |
| --- | --- | --- |
| `videoChannelId` | `17456868-db4a-4386-a2b3-334f25b83fc4` | `inside-the-white-grey-brahman-bull-horn-factory-or-how-luxury-ho` |
| `itemId` | `tiplink-inside-the-white-grey-brahman-bull-horn-factory-or-how-luxury-ho` | TipLink `10c4d6a9-ca78-4511-aaf0-9e03b3e5fb9c` |
| Event | `0fff0bb8-3a0f-46fe-8a92-da80bb26343f` | Wave 3 acceptance / E2E featured overlay event |

`itemId` is `tiplink-${slug}` from `trackTiplinkVideoEncounter` — proof the **loaded page slug** was Brahman, not Ronaldo.

`17456868-…` is also `E2E_FEATURED_OVERLAY_CHANNEL_ID` in `src/lib/e2e-explore-fixtures.ts` (Wave 3 handoff), not the Ronaldo channel.

## Per-flow identity (inferred)

| Flow | Used approved fixture? | Loaded content | Playback ≥10s in repo? |
| --- | --- | --- | --- |
| **Public** (reported) | **No** | Brahman TipLink slug (see above) | **Not verified** — no redacted HAR on disk; `video_start` only proves start, not duration |
| **Preview** (reported) | **No** (same payload ids) | Same Brahman channel/slug | **Not verified** — same gap |

Prior SSR on immutable deploy (`public-page-body-sample.txt`) **did** embed Ronaldo fixture IDs — automation never tied that to the new browser analytics capture.

## `/tv/analytics` request evidence

- **Reported:** batch includes v2 TipLink surface events (engineering capture).
- **Repo:** **no** redacted HAR; **no** recorded HTTP status or response body paths.
- **Required:** attach `public-tiplink-acceptance-redacted.har` and `preview-tiplink-acceptance-redacted.har` under this folder with `POST` entries to staging `…/tv/analytics`.

## Discrepancy explanation

Same host (`emediongudoh`) has **multiple published TipLinks** on staging. The capture matches the **Brahman** link (recent `updatedAt` 2026-11-12, Wave 3 channel), consistent with opening a **non-acceptance URL** (dashboard copy, bookmark, or wrong tab) while exercising preview + public flows. This is a **test targeting error**, not evidence that the Ronaldo fixture resolves to the Brahman channel.

## Repeat required (authorized fixture only)

On immutable `…g0hjhjlep…` only:

1. Public: `/l/ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea`
2. Preview: `/l/preview/07e18a5a-5c75-4665-b321-f0fe294b1809` (authorized host session)
3. Play ≥10s each; HAR must show `videoChannelId` = `7fc7b429-…` and `itemId` = `tiplink-ronaldo-when-im-retired-in-10-years-portugal-v-wales-nations-lea`
4. Optional: `watch_duration` / segment events in batch for duration proof

Automation re-run here **BLOCKED** (Vercel deployment protection; no HAR upload).

## Artifacts (this reconciliation)

| File | Role |
| --- | --- |
| `staging-fixture-identity-map-2026-11-12.json` | API-backed identity map |
| `analytics-observed-vs-expected-2026-11-12.json` | Observed vs expected fields |
| `FIXTURE-RECONCILIATION-REPORT-2026-11-12.md` | This report |
