# Architecture

```
┌──────────────────────── React UI (src/) ────────────────────────┐
│ components/  Gallery · Editor · AiPanel · Applied · Settings     │
│ state/store.ts   zustand store: library, applied history, settings│
│ core/            PURE logic, no DOM/Tauri:                       │
│   skin.ts        Skin schema (zod) + versioning                  │
│   render.ts      Skin → SVG                                      │
│   presets.ts     built-in packs (data)                           │
│   packs.ts       .fskin pack format                              │
│   rasterize.ts   SVG → PNG (canvas)                              │
│ ai/              ImageProvider + OpenAI/Stability, recipes.ts    │
│ core/cutout.ts   white-background removal (pure, tested)         │
│ i18n/            t() + locale dictionaries                       │
│ platform/        api.ts (only file that calls Tauri) · storage.ts│
└───────────────────────────── IPC ───────────────────────────────┘
┌──────────────────────── Rust (src-tauri/src) ───────────────────┐
│ commands.rs      validated IPC entry points                      │
│ icon.rs          PNG decode, .ico encode                         │
│ desktop_ini.rs   pure desktop.ini merge/revert (unit tested)     │
│ platform/        windows.rs · macos.rs · unsupported.rs          │
└──────────────────────────────────────────────────────────────────┘
```

## Core idea: skins are data

A skin is a small JSON document (`Skin` in `src/core/skin.ts`), not an image. When you apply one:

1. `renderSkinSvg(skin)` produces an SVG. It is a pure function and is easy to test.
2. `skinToPngBase64` rasterises it to a 1024 px PNG in the webview.
3. The `apply_skin` IPC command hands the PNG to Rust. Rust builds a multi-size `.ico` (Windows) or passes the PNG to NSWorkspace (macOS).

Because skins are data, they are tiny, fully editable after saving, and shareable as text. They render crisply at every size.

## Persistence

`platform/storage.ts` uses `tauri-plugin-store`: a JSON file in the OS app data folder. In browser preview mode it uses `localStorage`. It stores these keys:

| key | contents |
|---|---|
| `userSkins` | `Skin[]` the user created |
| `importedPacks` | `Pack[]` imported from `.fskin` files |
| `applied` | `{ folder, skinId, skinName, appliedAt }[]` |
| `settings` | AI provider, API keys, model ids |

Invalid stored entries are dropped on load. A bad file therefore can't crash the app.

## Versioning

- `Skin.schemaVersion` (currently 1). On a breaking change, bump `SKIN_SCHEMA_VERSION` and add the upgrade step to `migrateSkin()`.
- `.fskin` files carry `{ format: "folderskins.pack", version }`. `parsePackFile` validates them and gives imported skins fresh ids, so importing never overwrites existing data.

## Extension points

| You want to… | Do this |
|---|---|
| Add a folder silhouette | Add the name to `SHAPES` (skin.ts) and a `GEOMETRY` entry (render.ts). |
| Add a built-in theme pack | Append a `pack(...)` to `BUILTIN_PACKS` (presets.ts). Keep ids stable. |
| Add an AI vibe or idea | Append to `VIBES` / `OBJECT_IDEAS` in `ai/recipes.ts`. |
| Add an AI provider | Implement `ImageProvider` (ai/types.ts), register it in `PROVIDERS` (ai/index.ts), and allow its host in `src-tauri/capabilities/default.json`. |
| Add a language | Copy `i18n/locales/en.ts`, translate it, and register it in `i18n/index.ts`. Missing keys fall back to English. |
| Support Linux | Add `platform/linux.rs` with `apply`/`revert` (e.g. `gio set <dir> metadata::custom-icon`, KDE `.directory`). Wire it up in `platform/mod.rs`. |
| Add bulk apply / auto-rules | `store.applySkin(skin, folder)` is per folder, so loop over folders in a new view. |
| Add an online gallery/marketplace | The `Pack` type is already the exchange format. Add a `GalleryProvider` that lists and downloads packs, then call `importPack`. |
| Add an Explorer/Finder context menu | Needs a Windows shell extension (registry verb) and a macOS Finder Sync/Quick Action. Both can launch the app with a `--folder` argument (via `tauri-plugin-cli`) that sets `targetFolder`. |

## Security notes

- The CSP allows only self, `data:` and `blob:` images. Network access goes through `tauri-plugin-http`, and only to the AI hosts listed in the capability file.
- The file IPC commands only read and write `.fskin`/`.json`/`.ico`/`.png` extensions, at paths the user picked in a native dialog.
- `apply_skin`/`revert_skin` require an existing absolute directory and refuse drive roots.
