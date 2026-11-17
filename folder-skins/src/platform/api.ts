/**
 * The ONLY module that talks to Tauri. Everything else in the UI calls these
 * functions, so a browser fallback (used for `npm run dev` UI work and tests)
 * or a different shell (Electron, web) can be swapped in here.
 */
import { invoke } from "@tauri-apps/api/core";

export const isTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface PlatformInfo {
  os: "windows" | "macos" | "linux" | "web" | string;
  /** Whether applying folder icons is implemented on this OS. */
  supported: boolean;
}

export async function platformInfo(): Promise<PlatformInfo> {
  if (!isTauri()) return { os: "web", supported: false };
  return invoke<PlatformInfo>("platform_info");
}

export async function applyIconToFolder(folder: string, pngBase64: string): Promise<void> {
  await invoke("apply_skin", { folder, pngBase64 });
}

export async function revertFolderIcon(folder: string): Promise<void> {
  await invoke("revert_skin", { folder });
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return window.prompt("Folder path (browser preview mode):")?.trim() || null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const res = await open({ directory: true, multiple: false });
  return typeof res === "string" ? res : null;
}

export async function confirmAsk(message: string): Promise<boolean> {
  if (!isTauri()) return window.confirm(message);
  const { ask } = await import("@tauri-apps/plugin-dialog");
  return ask(message, { title: "FolderSkins", kind: "warning" });
}

/** Subscribe to folders dropped onto the window. Returns an unsubscribe fn. */
export async function onPathsDropped(cb: (paths: string[]) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  return getCurrentWebview().onDragDropEvent((e) => {
    if (e.payload.type === "drop") cb(e.payload.paths);
  });
}

// ---------- files (packs / icon export) ----------

export async function openTextFile(extensions: string[]): Promise<string | null> {
  if (!isTauri()) return browserPickText(extensions);
  const { open } = await import("@tauri-apps/plugin-dialog");
  const path = await open({ multiple: false, filters: [{ name: "FolderSkins pack", extensions }] });
  if (typeof path !== "string") return null;
  return invoke<string>("read_text_file", { path });
}

export async function saveTextFile(defaultName: string, contents: string, extensions: string[]): Promise<boolean> {
  if (!isTauri()) {
    browserDownload(defaultName, new Blob([contents], { type: "application/json" }));
    return true;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({ defaultPath: defaultName, filters: [{ name: "FolderSkins pack", extensions }] });
  if (!path) return false;
  await invoke("write_text_file", { path, contents });
  return true;
}

/** Save a rendered icon. The native side encodes .ico/.png based on the chosen extension. */
export async function saveIconFile(defaultName: string, pngBase64: string): Promise<boolean> {
  if (!isTauri()) {
    const bytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
    browserDownload(defaultName.replace(/\.\w+$/, ".png"), new Blob([bytes], { type: "image/png" }));
    return true;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "Icon", extensions: ["ico", "png"] }],
  });
  if (!path) return false;
  await invoke("save_icon_file", { path, pngBase64 });
  return true;
}

function browserDownload(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function browserPickText(extensions: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = extensions.map((e) => `.${e}`).join(",");
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

/** Open a URL in the user's default browser. */
export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
