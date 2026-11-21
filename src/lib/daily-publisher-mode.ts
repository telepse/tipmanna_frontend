/** Mock provider tokens from API when STREAMING_PROVIDER_MODE=mock. */
export function isMockDailyPublisherToken(token: string): boolean {
  return token.startsWith("mock-publisher-");
}
