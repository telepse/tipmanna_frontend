# Payment transaction and return state

Evidence base: `tv-provider.tsx`, `src/lib/tv-post-payment-axis.ts`, `src/hooks/use-payment-playback-restore.ts`, `tv-playback-contract.spec.ts`.

## TV payment pause

- Overlay banner hold vs session (drawer/Stripe) hold; `paymentActiveRef = overlay || session`.
- Redirect snapshots arm **session** pause hold.
- `resumeAfterPayment` captures and clears tip-success exactly once at entry.

## PPLA (Case D)

- GLOBAL-origin **successful** payment: restore mode is **LOCAL** (post-payment live axis), not wall-clock GLOBAL.
- Armed via `shouldArmPostPaymentAxis` → `postPaymentAxisRef`.
- Stripe: preserve `originMode` on redirect snapshot.
- Legacy GLOBAL snapshots may still restore wall-clock GLOBAL.

## Explore / non-TV Stripe return

- `usePaymentPlaybackRestore` seeks `restoreOffsetSec`, plays, applies `restoreWasMuted` (fallback `readSessionMuted()`).
- Same-tab `sessionStorage` preserves mute preference across redirect.
