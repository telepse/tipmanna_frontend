# Superadmin / LIVE-016 branding UI — RC status (2026-10-31, corrected)

## Repository and revisions

| Item                         | Value                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Repo                         | `telepse/tipmanna_superadmin` (local: `C:\Users\Elite\Documents\Tipmanna\tipmanna_superadmin`)                      |
| Branch                       | `feature/pr-live-b1-finish-b`                                                                                       |
| **RC HEAD (acceptance pin)** | `05f6a90bf81a7029daa34bc89aae6ca7faa7630a` — merge dev for Finish B acceptance                                      |
| **LIVE-016 editor commit**   | `ccde5a724fc6eae0a94ba0e18c5f1630c388e4ff` — `feat(streaming): superadmin host branding rotation editor (LIVE-016)` |

Absence from `frontend-wt-b1-finish-b-restore` is expected: superadmin is a **separate SPA**, not the host frontend.

## Implementation recovered (not missing)

| Surface              | Path                                                      | Status                                                                                     |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| RTK Query API        | `src/api/streamingPlatformApi.ts`                         | `GET/PUT …/hosts/:hostId/branding-rotation` on `${VITE_API_ENDPOINT}/superadmin/streaming` |
| Admin UI             | `src/pages/streaming-platform-admin.tsx`                  | Section **Advanced branding rotation (LIVE-016)** — JSON textarea + save after host lookup |
| Host preview (FE RC) | `HostStreamBrandingPreview` in host frontend @ `ab374ff…` | Read-only preview of rotation for host Advanced Studio                                     |

## API compatibility (superadmin ↔ Finish B BE)

| Contract   | Superadmin client                                       | Backend @ `b4a52bf…`                                                     |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| GET        | `/superadmin/streaming/hosts/:hostId/branding-rotation` | `getHostBrandingRotationAdmin` → `{ hostId, slots }`                     |
| PUT        | body `{ slots }`                                        | `putHostBrandingRotationAdmin` — requires `slots: BrandingOverlaySlot[]` |
| Slot shape | `{ id, label, durationSeconds }`                        | Same as `branding-overlay.config.ts` / `BrandingOverlaySlot`             |

**Verdict:** Wire contract **matches**. No backend gap for LIVE-016 persistence or superadmin routes.

## Gaps (acceptance / release, not greenfield code)

| Gap                    | Owner / action                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Third PR**           | Open superadmin PR from `feature/pr-live-b1-finish-b` @ **`05f6a90`** (includes `ccde5a7`) against superadmin default branch — **not** host FE/BE PRs alone                                                |
| **UI acceptance walk** | Superadmin: lookup host → edit slots JSON → save → confirm host Advanced Studio preview updates → (optional real) compositor applies `brandingLabel` via Daily `live-streaming/update` custom text overlay |
| **Deploy coupling**    | Superadmin build must point `VITE_API_ENDPOINT` at same API revision as BE RC; superadmin auth cookie/token as per existing streaming platform admin page                                                  |
| **Validation**         | Superadmin `npm ci` / build not re-run in this closeout — owner CI on superadmin repo before merge                                                                                                         |

## LIVE-016 required UI acceptance (checklist)

1. Sign in to superadmin SPA (RC build @ `05f6a90`).
2. Open streaming platform admin; **lookup** disposable Phase 0 host (or test host).
3. Edit branding rotation JSON (e.g. change `sponsor_a` label); **Save** — expect success toast.
4. On host frontend @ `ab374ff`, open Advanced Studio branding preview — **slots match** saved JSON.
5. (Full B1) After programme goes live with real compositor, optional evidence: lower-third text matches active rotation slot label on **Daily programme output** (composition path), not merely in-browser publisher tiles.

**Phase 0 phone / trusted-LAN evidence preserved** — this checklist is additive for LIVE-016 superadmin delivery proof.
