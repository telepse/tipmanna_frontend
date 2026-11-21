export function isMockDailyReceiveProbeToken(token: string): boolean {
  return token.startsWith("mock-receive-probe-");
}
