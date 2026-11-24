# Tip Quote — staging acceptance closure (2026-11-24)

## Environment under test

| Item | Value |
|------|-------|
| Staging FE (acceptance candidate) | `fdbfa9eaf2747addcb8eb06065a5d5cf2f9ec94f` |
| Staging FE URL | `https://tipmanna-fj3ffgvfq-test01.vercel.app/` |
| Staging BE | `c0bb3dd6d2abee56df927d919867c4f851b66a3b` |
| Stripe mode (TipLink LIVE verify) | Test mode (`livemode=false`; `pk_test_` / `sk_test_` prefixes only — secrets not recorded) |

**SHA note:** Acceptance was executed against staging FE `fdbfa9e` (Tip Quote + TipLink UI on that deploy). Later staging tip `c3c145e` still contains the Tip Quote FE commit ancestry (`f1dd961`); it is a newer staging tip, not a re-run of this acceptance matrix.

## Evidence rules

- One quote ID / PaymentIntent ID may prove **one** surface only.
- Quote consumption alone is **not** payment success; a succeeded Transaction (or wallet debit + ledger) is required for payment PASS.
- Wallet debit does **not** require a Stripe PaymentIntent.
- Legacy events without LIVE TipConfig do **not** require a tip quote.
- Owner-attested UI observations are labelled separately from system-verified DB / Stripe evidence.
- Do not paste secrets, private credentials, or full card data.

## Surface classification (expected `surface` on quote)

| Checkout UI | Expected quote `surface` |
|-------------|--------------------------|
| Content | `content_client` |
| Channel (standalone) | `channel_client` |
| Event Room (`event-live`) | `event_room` |
| Explore Trends tip | `explore_feed` (community mode: `community_feed`) |
| TipLink landing | `tiplink` |
| Channel opened from Event Room | `event_room` when `openedFromEventRoom` / prop set |
| Wallet debit on LIVE event | Quote required; `paymentMethod=wallet`; no PI |

## Final acceptance register

| # | Case | Result | System-verified evidence | Owner-attested UI | Notes |
|---|------|--------|--------------------------|-------------------|-------|
| 1 | Content checkout | **PASS** | Quote `16669ba0-3b29-497e-b1e1-bbd46eb8d9eb` (`content_client`, £15.00 GBP, consumed); PI `pi_3UfGVuFN5yFVZ7l91HrM9jKA`; tx `bca43118-cada-4eb1-91a6-d9e4c3b77e6c` **succeeded** (`paymentSurface=content_client`) | Success animation + redirect (owner + quote record from earlier closure notes) | Re-read from staging DB 2026-11-24 closeout |
| 2 | Channel checkout | **PASS** | Quote `59dbc1cc-743d-4e6a-a356-a78b9b47afcc` (`channel_client`, £10.00 GBP, consumed); PI `pi_3UfGZcFN5yFVZ7l91qU3Dezc`; tx `3180516d-2347-4696-adda-ad7cee7bbd0d` **succeeded** (`paymentSurface=channel_client`) | Owner + quote record (earlier closure notes) | Independent from Content |
| 3 | Event Room checkout | **PASS** | Quote `436ef5b4-cb62-4d97-b6c4-87e924173e8a` (`event_room`, £42.00 GBP, consumed); PI `pi_3UfIqyFN5yFVZ7l91CmzWjKv`; tx `46458f2c-5675-4333-9acb-b14956608be2` **succeeded** (`paymentSurface=event_room`) | — | Distinct quote/PI from Channel/Content; Event Room follow-up **closed** |
| 4 | Explore checkout | **PASS** | Quote `dd63c90a-ac7c-4849-8042-9646c3e14c84` (`explore_feed`, £20.00 GBP, consumed); PI `pi_3UfIvSFN5yFVZ7l90wCBUagm`; tx `5d68bfa2-83bf-41bc-b5f4-963ce9c63b4a` **succeeded** (`paymentSurface=explore_feed`) | Success + animation (owner-reported earlier) | Quote correlation **complete** (no longer pending) |
| 5 | Wallet debit tip | **PASS** | Quote `53a48976-d4f7-48f8-811e-120e9ecd9d72` (LIVE event, consumed, `paymentIntentId=null`); tx `4db4293d-5e6b-4566-a753-f6c0bd0b9fa2` **succeeded** (`paymentMethod=wallet`, `paymentSurface=event_room`); ledger debit `47df97f6-49db-4829-ad08-537d89450844` linked to that tx | — | No PaymentIntent expected or observed |
| 6 | Legacy event (no LIVE TipConfig) | **PASS** | Event `0fff0bb8-3a0f-46fe-8a92-da80bb26343f` has **no** TipConfig row; multiple succeeded TipLink txs (e.g. `263e2b7e-…` / PI `pi_3UfJ44FN5yFVZ7l90EhuscaZ`, £10 GBP) without LIVE quote requirement | — | Quote not required on this path |
| 7 | Negative: missing / invalid `tipQuoteId` on LIVE event | **PASS** | Previously executed staging API probes (2026-11-24 closure): missing and invalid `tipQuoteId` both returned **HTTP 400**; probe window showed no successful charge/ledger from those requests | — | Evidence basis: prior staging probe run + no-charge window check scripts; **not** re-executed in this docs closeout |
| 8 | TipLink landing checkout (payment) | **PASS** | Quote `da4924c8-e32f-454a-94e7-e945537b33f6` (`tiplink`, £10.00 GBP, consumed, bound to PI); PI `pi_3UfLYfFN5yFVZ7l91w6OXAh6` **succeeded**, `livemode=false`, amount 1000 gbp; tx `d50a791f-6384-42f8-90f1-d9e96c77382a` **succeeded** (`paymentSurface=tiplink`); exactly one succeeded tx for that PI | See row 9 | System verify re-confirmed during integrated audit / docs closeout read |
| 9 | TipLink success animation + return navigation | **PASS** | — | **Owner-attested UI acceptance: PASS.** Owner confirmed: personally saw the TipLink success animation and was returned to the expected page without a blank or broken screen. | Distinct from payment/DB evidence; checkout not re-run |

## TipLink payment integrity (system-verified summary)

For TipLink quote `da4924c8-…` / PI `pi_3UfLYf…`:

- Stripe test mode (`livemode=false`).
- PaymentIntent status `succeeded`; amount/currency matched quote (`1000` / `gbp`).
- Quote `consumedAt` set and `paymentIntentId` bound to that PI.
- Exactly one succeeded Transaction for the PI; no duplicate success identified in the verify window.

## Automated checks (2026-11-24) — not re-run in this closeout

- Tip Quote FE unit tests: **10/10 PASS** (Vitest 3.2.7; RC sources exercised via analytics worktree runner because the tip-quote RC worktree’s junctioned Vitest 3.2.4 falsely reported “No test suite found”).
- Explore audio + TipLink audio/payment-return specs: **34/34 PASS** across four files on the analytics worktree (same contract sources present on staging ancestry).

These results are attributed to the 2026-11-24 staging-acceptance workstream; this documentation PR does **not** claim a fresh test execution.

## Closure statement

All required Tip Quote staging acceptance cases in the register above are **PASS**. No remaining owner packet items are outstanding for this approved scope. Stale “Event Room follow-up” and “Remaining smallest owner packet” instructions from earlier draft notes are superseded by this register.

This document records existing staging acceptance evidence only. It does not change application behavior.
