/**
 * Merge a community-bank revalidate result with last-good list.
 * Failed refreshes must not wipe a prior successful bank list.
 */
export function mergeCommunityBankRefreshResult<T>(args: {
  prior: T[];
  next: T[];
  anySuccess: boolean;
}): T[] {
  const { prior, next, anySuccess } = args;
  if (anySuccess) {
    return next;
  }
  if (prior.length > 0) {
    return prior;
  }
  return next;
}
