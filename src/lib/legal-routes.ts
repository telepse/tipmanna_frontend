/**
 * Public legal routes. Every "terms" / "Terms & Conditions" mention links to
 * `serviceTerms`; the Android TV terms are featured from that page.
 * The Android TV app (`LegalUrls.kt`) depends on these paths — keep them in sync.
 */
export const LEGAL_ROUTES = {
  serviceTerms: "/terms",
  androidTvServiceTerms: "/terms/android-tv",
  privacyPolicy: "/privacy-policy",
  cookiePolicy: "/cookie-policy",
} as const;
