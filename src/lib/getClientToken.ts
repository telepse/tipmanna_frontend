// clientGetToken.ts
export function getClientTokenFromPersist(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const persistRoot = localStorage.getItem("persist:root");
    if (!persistRoot) return null;

    // Parse the root persist object
    const root = JSON.parse(persistRoot);

    // The auth slice is a JSON string itself
    if (!root.auth) return null;
    const auth = JSON.parse(root.auth);

    // Return the token
    return auth.token || null;
  } catch (error) {
    console.error("Failed to read token from persist:root", error);
    return null;
  }
}
