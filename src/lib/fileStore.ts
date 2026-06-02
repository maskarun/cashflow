// Auto-save / auto-load JSON to a user-chosen file via the File System Access API.
// Persists the FileSystemFileHandle in IndexedDB so we can re-open on next launch
// (after re-verifying permission, which requires a user gesture).

const DB_NAME = "budget-fs";
const STORE = "handles";
const HANDLE_KEY = "data-file";

export type AnyFileHandle = FileSystemFileHandle;

function isSupported() {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const fileStore = {
  isSupported,

  async getSavedHandle(): Promise<AnyFileHandle | null> {
    try {
      const h = await idbGet<AnyFileHandle>(HANDLE_KEY);
      return h ?? null;
    } catch {
      return null;
    }
  },

  async ensurePermission(handle: AnyFileHandle, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
    // @ts-expect-error - non-standard but widely available in Chromium
    const query = await handle.queryPermission?.({ mode });
    if (query === "granted") return true;
    // @ts-expect-error - requires a user gesture
    const req = await handle.requestPermission?.({ mode });
    return req === "granted";
  },

  async pickExisting(): Promise<AnyFileHandle | null> {
    if (!isSupported()) return null;
    // @ts-expect-error - File System Access API
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      multiple: false,
    });
    await idbSet(HANDLE_KEY, handle);
    return handle as AnyFileHandle;
  },

  async pickNew(suggestedName = "my-money.json"): Promise<AnyFileHandle | null> {
    if (!isSupported()) return null;
    // @ts-expect-error - File System Access API
    const handle: AnyFileHandle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
    });
    await idbSet(HANDLE_KEY, handle);
    return handle;
  },

  async readJSON<T>(handle: AnyFileHandle): Promise<T | null> {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  },

  async writeJSON(handle: AnyFileHandle, data: unknown): Promise<void> {
    const writable = await (handle as unknown as { createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }> }).createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  },

  async forget(): Promise<void> {
    await idbDel(HANDLE_KEY);
  },
};
