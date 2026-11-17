# FolderSkins

A desktop app for **Windows and macOS** that changes how your folders look.

- **Different looks.** 60+ built-in skins in 9 packs: Essentials, Gradients, Badges, Neon, Pastel, Retro, Dark Glass, Nature and Shapes. There are 5 folder silhouettes (classic, rounded, flat, 3D, outline).
- **Easy to change.** Choose a folder (or drag one onto the window), click a skin, and the folder changes. *Restore original* puts the folder back the way it was.
- **Make your own skins.** The designer has shape, solid/gradient fills, emoji or letter badges, your own image and effects (shadow, gloss, glow). **AI generation** turns a text prompt into artwork using your own OpenAI or Stability API key.
- **Share skins.** Export your skins as a `.fskin` pack, and import packs other people made.

Built with **Tauri 2** (Rust) and **React + TypeScript**. Installers are about 10 MB.

## Quick start

Prerequisites: Node 20+, Rust (stable), and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS (WebView2 on Windows, Xcode CLT on macOS).

```bash
cd folder-skins
npm install
npm run tauri dev      # run the desktop app with hot reload
npm run tauri build    # build installers (.msi/.exe on Windows, .dmg/.app on macOS)
```

`npm run dev` opens only the UI, in a browser. You can design and export skins there, but applying them needs the desktop app.

### Tests

```bash
npm test                         # skin schema, renderer, pack format (vitest)
npm run typecheck
cd src-tauri && cargo test       # desktop.ini editing, .ico encoding
```

## How applying a skin works

| OS | Mechanism | Revert |
|---|---|---|
| Windows | Writes a hidden `.folderskin-<stamp>.ico` and adds `IconResource=` to the folder's `desktop.ini`. Then it sets the folder's ReadOnly attribute so Explorer reads that file, and tells the shell to refresh. Your existing `desktop.ini` settings and any original icon are preserved. | Restores the original `desktop.ini` lines (or deletes the file if we created it), removes the `.ico`, and clears ReadOnly if we set it. |
| macOS | `NSWorkspace setIcon:forFile:` (the same thing Finder's *Get Info → paste* does), called through `osascript`. | `setIcon:nil`. |
| Linux | Not implemented yet. The UI says so, and designing and exporting skins still work. | – |

## AI generation

Open **Settings → AI image generation**, pick a provider and paste your API key. Then use **Create → Generate with AI**. The generated image is attached to the skin as a badge, as a cover over the folder front, or as the whole icon.

Keys are stored only on your computer (in the app data folder, `folderskins.json`). They are sent only to the provider you selected.

## Known limitations

- Installers are **unsigned**, so Windows SmartScreen and macOS Gatekeeper will warn on first launch. Code-signing certificates are needed for public distribution.
- Windows Explorer sometimes caches icons aggressively. If a folder doesn't update, press F5 in Explorer or reopen the window.
- On macOS the folder must be writable by your user. Protected locations such as `/Applications` will fail with a permissions error.
- API keys are stored unencrypted in the app's data file. Moving them to the OS keychain is a planned improvement.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the code layout and how to extend it.
