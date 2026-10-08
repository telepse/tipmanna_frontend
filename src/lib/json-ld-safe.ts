/** Escape `<` in JSON-LD script payloads to reduce XSS breakout risk. */
export function safeJsonLdStringify(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
