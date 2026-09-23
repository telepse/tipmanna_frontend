/** Explore create + nested sign-in must sit above immersive explore chrome (100018+). */
export function shouldUseExploreCreateLayer(pathname: string | null): boolean {
  return (
    pathname === "/explore" || (pathname?.startsWith("/explore/") ?? false)
  );
}
