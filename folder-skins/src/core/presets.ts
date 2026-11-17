import { defaultSkin, type Skin } from "./skin";
import type { Pack } from "./packs";

/**
 * Built-in skin packs. Pure data — add a new themed pack by appending to
 * BUILTIN_PACKS. Ids must be stable (they are referenced by applied-folder history).
 */

type SkinInit = Omit<Partial<Skin>, "id"> & { name: string };

function pack(id: string, name: string, description: string, skins: SkinInit[]): Pack {
  return {
    id,
    name,
    description,
    builtin: true,
    skins: skins.map((s, i) => defaultSkin({ ...s, id: `${id}-${i}`, tags: [id, ...(s.tags ?? [])] })),
  };
}

const COLORS: [string, string][] = [
  ["Blue", "#3b82f6"], ["Sky", "#0ea5e9"], ["Teal", "#14b8a6"], ["Green", "#22c55e"],
  ["Lime", "#84cc16"], ["Yellow", "#eab308"], ["Orange", "#f97316"], ["Red", "#ef4444"],
  ["Pink", "#ec4899"], ["Purple", "#a855f7"], ["Indigo", "#6366f1"], ["Graphite", "#475569"],
];

const GRADIENTS: [string, string, string, number][] = [
  ["Sunset", "#f97316", "#db2777", 120], ["Ocean", "#06b6d4", "#3b82f6", 90],
  ["Aurora", "#22c55e", "#8b5cf6", 135], ["Peach", "#fdba74", "#f472b6", 90],
  ["Royal", "#6366f1", "#a21caf", 45], ["Lagoon", "#2dd4bf", "#0369a1", 160],
  ["Citrus", "#facc15", "#22c55e", 90], ["Ember", "#ef4444", "#7c2d12", 90],
];

const BADGES: [string, string, string][] = [
  ["Code", "💻", "#1e293b"], ["Music", "🎵", "#a855f7"], ["Photos", "📷", "#0ea5e9"],
  ["Videos", "🎬", "#ef4444"], ["Games", "🎮", "#22c55e"], ["Documents", "📄", "#64748b"],
  ["Work", "💼", "#92400e"], ["School", "🎓", "#1d4ed8"], ["Money", "💰", "#ca8a04"],
  ["Downloads", "⬇️", "#0d9488"], ["Favorites", "⭐", "#f59e0b"], ["Personal", "❤️", "#e11d48"],
  ["Design", "🎨", "#db2777"], ["Travel", "✈️", "#0284c7"], ["Archive", "📦", "#78716c"],
  ["Secret", "🔒", "#334155"],
];

export const BUILTIN_PACKS: Pack[] = [
  pack("essentials", "Essentials", "Classic folders in clean solid colours.",
    COLORS.map(([name, color]): SkinInit => ({ name, fill: { type: "solid", color } }))),

  pack("gradients", "Gradients", "Smooth two-tone gradients with a glossy finish.",
    GRADIENTS.map(([name, from, to, angle]): SkinInit => ({
      name, shape: "rounded", fill: { type: "linear", from, to, angle }, effects: { shadow: true, gloss: true, glow: false },
    }))),

  pack("badges", "Badges", "Folders labelled with an icon so you can spot them instantly.",
    BADGES.map(([name, value, color]): SkinInit => ({ name, fill: { type: "solid", color }, badge: { kind: "emoji", value } }))),

  pack("neon", "Neon", "Glowing outlines for dark desktops.",
    [["Cyber Pink", "#ff2bd6"], ["Electric Blue", "#22d3ee"], ["Toxic Green", "#39ff14"], ["Laser Red", "#ff3131"], ["Volt", "#faff00"], ["Ultraviolet", "#b026ff"]]
      .map(([name, color]): SkinInit => ({ name, shape: "outline", fill: { type: "solid", color }, effects: { shadow: false, gloss: false, glow: true } }))),

  pack("pastel", "Pastel", "Soft, rounded and calm.",
    [["Mint", "#a7f3d0"], ["Lavender", "#ddd6fe"], ["Blush", "#fbcfe8"], ["Butter", "#fef08a"], ["Powder", "#bfdbfe"], ["Apricot", "#fed7aa"]]
      .map(([name, color]): SkinInit => ({ name, shape: "rounded", fill: { type: "solid", color }, effects: { shadow: true, gloss: false, glow: false } }))),

  pack("retro", "Retro", "Flat 70s palette.",
    [["Mustard", "#d4a017"], ["Burnt Orange", "#cc5500"], ["Avocado", "#7a8b3a"], ["Teal 72", "#2a7b7b"], ["Brick", "#9c3b2e"], ["Cocoa", "#6b4226"]]
      .map(([name, color]): SkinInit => ({ name, shape: "flat", fill: { type: "solid", color }, effects: { shadow: false, gloss: false, glow: false } }))),

  pack("dark-glass", "Dark Glass", "Deep gradients with a glass sheen.",
    [["Obsidian", "#334155", "#020617"], ["Midnight", "#1e3a8a", "#020617"], ["Smoke", "#52525b", "#18181b"], ["Plum", "#581c87", "#0c0a09"], ["Abyss", "#134e4a", "#020617"], ["Wine", "#7f1d1d", "#0c0a09"]]
      .map(([name, from, to]): SkinInit => ({ name, shape: "3d", fill: { type: "radial", from, to }, effects: { shadow: true, gloss: true, glow: false } }))),

  pack("nature", "Nature", "Earthy tones with a touch of the outdoors.",
    [["Forest", "#166534", "🌲"], ["Ocean", "#0e7490", "🌊"], ["Autumn", "#b45309", "🍂"], ["Bloom", "#be185d", "🌸"], ["Sunny", "#ca8a04", "☀️"], ["Moss", "#4d7c0f", "🌿"]]
      .map(([name, color, value]): SkinInit => ({ name, shape: "rounded", fill: { type: "linear", from: color, to: "#1c1917", angle: 90 }, badge: { kind: "emoji", value }, badgePosition: "bottom-right" }))),

  pack("shapes", "Shapes", "One colour, every folder silhouette.",
    (["classic", "rounded", "flat", "3d", "outline"] as const).map((shape): SkinInit => ({
      name: shape === "3d" ? "3D" : shape[0].toUpperCase() + shape.slice(1), shape, fill: { type: "solid", color: "#4f8cff" },
    }))),
];

export function findBuiltinSkin(id: string): Skin | undefined {
  for (const p of BUILTIN_PACKS) {
    const s = p.skins.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
}
