import { create } from "zustand";
import { BUILTIN_PACKS } from "../core/presets";
import { PackSchema, USER_PACK_ID, type Pack } from "../core/packs";
import { SkinSchema, defaultSkin, newId, type Skin } from "../core/skin";
import { skinToPngBase64 } from "../core/rasterize";
import * as api from "../platform/api";
import { loadKey, saveKey } from "../platform/storage";
import { PROVIDERS } from "../ai";

export type View = "gallery" | "editor" | "applied" | "settings";

export interface AppliedEntry {
  folder: string;
  skinId: string;
  skinName: string;
  appliedAt: number;
}

export interface Settings {
  providerId: string;
  apiKeys: Record<string, string>;
  models: Record<string, string>;
}

export interface Toast { id: number; kind: "info" | "success" | "error"; message: string }

const DEFAULT_SETTINGS: Settings = {
  providerId: PROVIDERS[0].id,
  apiKeys: {},
  models: Object.fromEntries(PROVIDERS.map((p) => [p.id, p.defaultModel])),
};

const KEYS = { userSkins: "userSkins", packs: "importedPacks", applied: "applied", settings: "settings" } as const;

interface State {
  ready: boolean;
  platform: api.PlatformInfo;
  view: View;
  userSkins: Skin[];
  importedPacks: Pack[];
  applied: AppliedEntry[];
  settings: Settings;
  targetFolder: string | null;
  /** Skin currently open in the editor (a working copy). */
  draft: Skin | null;
  busy: string | null;
  toasts: Toast[];

  init(): Promise<void>;
  setView(v: View): void;
  notify(message: string, kind?: Toast["kind"]): void;
  dismissToast(id: number): void;

  setTargetFolder(f: string | null): void;
  openEditor(base?: Skin): void;
  updateDraft(patch: Partial<Skin>): void;
  saveDraft(): void;
  deleteUserSkin(id: string): void;

  importPack(p: Pack): void;
  removePack(id: string): void;

  applySkin(skin: Skin, folder: string): Promise<void>;
  revertFolder(folder: string): Promise<void>;

  updateSettings(patch: Partial<Settings>): void;
}

let toastSeq = 0;

export const useApp = create<State>((set, get) => ({
  ready: false,
  platform: { os: "web", supported: false },
  view: "gallery",
  userSkins: [],
  importedPacks: [],
  applied: [],
  settings: DEFAULT_SETTINGS,
  targetFolder: null,
  draft: null,
  busy: null,
  toasts: [],

  async init() {
    const [platform, rawSkins, rawPacks, applied, settings] = await Promise.all([
      api.platformInfo(),
      loadKey<unknown[]>(KEYS.userSkins, []),
      loadKey<unknown[]>(KEYS.packs, []),
      loadKey<AppliedEntry[]>(KEYS.applied, []),
      loadKey<Partial<Settings>>(KEYS.settings, {}),
    ]);
    // Drop anything that no longer validates instead of crashing the app.
    const userSkins = rawSkins.flatMap((s) => { const r = SkinSchema.safeParse(s); return r.success ? [r.data] : []; });
    const importedPacks = rawPacks.flatMap((p) => { const r = PackSchema.safeParse(p); return r.success ? [r.data] : []; });
    set({
      ready: true,
      platform,
      userSkins,
      importedPacks,
      applied,
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings,
        apiKeys: { ...settings.apiKeys },
        models: { ...DEFAULT_SETTINGS.models, ...settings.models },
      },
    });
  },

  setView: (view) => set({ view }),

  notify(message, kind = "info") {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => get().dismissToast(id), kind === "error" ? 7000 : 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setTargetFolder: (targetFolder) => set({ targetFolder }),

  openEditor(base) {
    const isOwn = base && get().userSkins.some((s) => s.id === base.id);
    const draft: Skin = base
      ? structuredClone({ ...base, id: isOwn ? base.id : newId(), name: isOwn ? base.name : `${base.name} copy`, tags: isOwn ? base.tags : [] })
      : defaultSkin();
    set({ draft, view: "editor" });
  },
  updateDraft(patch) {
    const d = get().draft;
    if (d) set({ draft: { ...d, ...patch } });
  },
  saveDraft() {
    const d = get().draft;
    if (!d) return;
    const skin = SkinSchema.parse({ ...d, name: d.name.trim() || "Untitled" });
    const exists = get().userSkins.some((s) => s.id === skin.id);
    const userSkins = exists ? get().userSkins.map((s) => (s.id === skin.id ? skin : s)) : [skin, ...get().userSkins];
    set({ userSkins, draft: skin });
    void saveKey(KEYS.userSkins, userSkins);
    get().notify(`Saved “${skin.name}” to My Skins`, "success");
  },
  deleteUserSkin(id) {
    const userSkins = get().userSkins.filter((s) => s.id !== id);
    set({ userSkins });
    void saveKey(KEYS.userSkins, userSkins);
  },

  importPack(p) {
    const importedPacks = [...get().importedPacks, p];
    set({ importedPacks });
    void saveKey(KEYS.packs, importedPacks);
    get().notify(`Imported pack “${p.name}” (${p.skins.length} skins)`, "success");
  },
  removePack(id) {
    const importedPacks = get().importedPacks.filter((p) => p.id !== id);
    set({ importedPacks });
    void saveKey(KEYS.packs, importedPacks);
  },

  async applySkin(skin, folder) {
    set({ busy: `Applying “${skin.name}”…` });
    try {
      const png = await skinToPngBase64(skin);
      await api.applyIconToFolder(folder, png);
      const entry: AppliedEntry = { folder, skinId: skin.id, skinName: skin.name, appliedAt: Date.now() };
      const applied = [entry, ...get().applied.filter((a) => a.folder !== folder)];
      set({ applied });
      void saveKey(KEYS.applied, applied);
      get().notify(`Applied “${skin.name}” to ${baseName(folder)}`, "success");
    } catch (e) {
      get().notify(`Could not apply skin: ${errMsg(e)}`, "error");
    } finally {
      set({ busy: null });
    }
  },

  async revertFolder(folder) {
    set({ busy: "Restoring original icon…" });
    try {
      await api.revertFolderIcon(folder);
      const applied = get().applied.filter((a) => a.folder !== folder);
      set({ applied });
      void saveKey(KEYS.applied, applied);
      get().notify(`Restored the original icon of ${baseName(folder)}`, "success");
    } catch (e) {
      get().notify(`Could not restore: ${errMsg(e)}`, "error");
    } finally {
      set({ busy: null });
    }
  },

  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void saveKey(KEYS.settings, settings);
  },
}));

// ---------- selectors / helpers ----------

export function allPacks(s: Pick<State, "userSkins" | "importedPacks">): Pack[] {
  const mine: Pack = { id: USER_PACK_ID, name: "My Skins", description: "Skins you created.", builtin: false, skins: s.userSkins };
  return [mine, ...BUILTIN_PACKS, ...s.importedPacks];
}

export function findSkin(s: Pick<State, "userSkins" | "importedPacks">, id: string): Skin | undefined {
  for (const p of allPacks(s)) {
    const hit = p.skins.find((x) => x.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : JSON.stringify(e);
}
