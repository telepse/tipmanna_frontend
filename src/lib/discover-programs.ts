/** Most recent programs shown on Discover and TV program rails. */
export const DISCOVERY_PROGRAMS_DISPLAY_LIMIT = 5;

export function takeRecentDiscoveryPrograms<T>(programs: T[]): T[] {
  return programs.slice(0, DISCOVERY_PROGRAMS_DISPLAY_LIMIT);
}
