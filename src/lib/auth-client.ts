export function isSignedInUser(
  user: { id?: string } | null | undefined
): boolean {
  return Boolean(user?.id?.trim());
}
