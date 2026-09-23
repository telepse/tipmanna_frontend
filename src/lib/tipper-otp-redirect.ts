/** True when OTP verify should router.push (different in-app path than current). */
export function shouldNavigateAfterTipperVerify(
  targetPath: string | undefined,
  currentPathWithSearch: string
): boolean {
  if (
    !targetPath ||
    !targetPath.startsWith("/") ||
    targetPath.startsWith("//")
  ) {
    return false;
  }
  const normalize = (p: string) => {
    try {
      const u = new URL(p, "https://tipmanna.tv");
      return `${u.pathname}${u.search}`;
    } catch {
      return p;
    }
  };
  return normalize(targetPath) !== normalize(currentPathWithSearch);
}
