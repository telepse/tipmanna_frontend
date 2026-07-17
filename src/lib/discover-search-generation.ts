/** Returns true when an in-flight Discover search response matches the latest request. */
export function shouldApplyDiscoverSearchResult(
  issuedGen: number,
  currentGen: number
): boolean {
  return issuedGen === currentGen;
}
