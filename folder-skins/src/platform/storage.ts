/**
 * Tiny async key-value persistence. Uses tauri-plugin-store on desktop
 * (a JSON file in the app data dir) and localStorage in the browser.
 */
import { isTauri } from "./api";

const STORE_FILE = "folderskins.json";
const LS_PREFIX = "folderskins:";

type StoreLike = { get<T>(k: string): Promise<T | undefined>; set(k: string, v: unknown): Promise<void> };
let storePromise: Promise<StoreLike> | null = null;

function getStore(): Promise<StoreLike> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then(({ load }) => load(STORE_FILE, { autoSave: 200, defaults: {} }));
  }
  return storePromise;
}

export async function loadKey<T>(key: string, fallback: T): Promise<T> {
  try {
    if (isTauri()) return ((await (await getStore()).get<T>(key)) ?? fallback);
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch (e) {
    console.warn(`Failed to load "${key}"`, e);
    return fallback;
  }
}

export async function saveKey(key: string, value: unknown): Promise<void> {
  if (isTauri()) return (await getStore()).set(key, value);
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}
