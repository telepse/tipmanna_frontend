/** Persist auth token for service worker click tracking (IndexedDB). */

const DB_NAME = "tipmanna-push";
const STORE = "kv";
const TOKEN_KEY = "authToken";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function setPushAuthToken(token: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      if (token) {
        store.put(token, TOKEN_KEY);
      } else {
        store.delete(TOKEN_KEY);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("[push-auth-cache] set token failed", e);
  }
}
