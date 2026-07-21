import base from "./playwright.config";

/** Dev-only: reuse running `next dev` — no production webServer. */
export default {
  ...base,
  webServer: undefined,
};
