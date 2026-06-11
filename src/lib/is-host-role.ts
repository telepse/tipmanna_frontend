/** True when Redux (or API) role is host — case-insensitive. */
export function isHostRole(role: string | undefined | null): boolean {
  return role?.toUpperCase() === "HOST";
}
