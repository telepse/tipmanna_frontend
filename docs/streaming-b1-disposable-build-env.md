# Finish B — disposable Playwright / production build environment

**Scope:** Local disposable stack only (`127.0.0.1:5439` PG, **`127.0.0.1:8014`** API, **`127.0.0.1:3014`** frontend).  
**Not for staging or production deploys.** Use `.env.streaming.b1-e2e.example` → `.env.streaming.b1-e2e` (gitignored).

## Frontend production build (required for Playwright `npm run start`)

Set before `npm run build`:

| Variable | Example (disposable only) |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_API_URL` | `http://127.0.0.1:8014/api/v1` |

Without this URL, static generation for routes such as `/partner` fails (plan-pricing fetch against `undefined`).

Service worker verification runs as part of the production build; keep the same API URL for build and runtime.

## Playwright Advanced Studio journey

| Variable | Purpose |
| --- | --- |
| `STREAMING_B1_E2E=1` | Enables `setup-streaming-b1` + `streaming-b1-chromium` projects |
| `PLAYWRIGHT_BACKEND_URL` | API root without `/api/v1` (`http://127.0.0.1:8014`) |
| `PLAYWRIGHT_BASE_URL` | Frontend under test (`http://127.0.0.1:3014`) |
| `STREAMING_B1_E2E_EVENT_ID` / `STREAMING_B1_E2E_HOST_SLUG` | Optional; loaded from `.streaming-b1-e2e.json` when omitted |

Seed (backend, disposable DB):

```bash
npm run streaming:b1:e2e-env
npm run streaming:db:up
npm run streaming:db:migrate
npm run streaming:b1:e2e-seed
npm run start:b1-e2e
```

Frontend (separate terminal): copy `.env.streaming.b1-e2e.example` → `.env.streaming.b1-e2e`, then Playwright starts `next dev` on `3014` automatically when `STREAMING_B1_E2E=1`.

Run Playwright:

```bash
STREAMING_B1_E2E=1 PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8014 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3014 NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8014/api/v1 npx playwright test --project=streaming-b1-chromium
```
