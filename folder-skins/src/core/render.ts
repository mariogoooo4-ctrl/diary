import type { Fill, Shape, Skin } from "./skin";
import { darken, lighten } from "./color";

/**
 * Pure function: Skin -> SVG markup (256x256 viewBox).
 * No DOM access, so it runs in tests, workers, or a future CLI unchanged.
 * To add a new folder shape: add it to SHAPES in skin.ts and a geometry entry here.
 */

interface Geometry {
  back: string;
  front: string;
  /** Centre of the front panel, where badges are placed. */
  center: [number, number];
  /** Optional sheet of paper peeking out between back and front. */
  paper?: string;
}

const GEOMETRY: Record<Shape, Geometry> = {
  classic: {
    back: "M24 64 Q24 48 40 48 H100 Q108 48 114 56 L122 66 H216 Q232 66 232 82 V192 Q232 208 216 208 H40 Q24 208 24 192 Z",
    front: "M24 98 Q24 86 36 86 H220 Q232 86 232 98 V192 Q232 208 216 208 H40 Q24 208 24 192 Z",
    center: [128, 150],
  },
  rounded: {
    back: "M24 80 Q24 44 60 44 H96 Q110 44 118 56 L124 64 H196 Q232 64 232 100 V176 Q232 212 196 212 H60 Q24 212 24 176 Z",
    front: "M24 118 Q24 86 56 86 H200 Q232 86 232 118 V176 Q232 212 196 212 H60 Q24 212 24 176 Z",
    center: [128, 152],
  },
  flat: {
    back: "M28 56 H102 L120 74 H228 V206 H28 Z",
    front: "M28 92 H228 V206 H28 Z",
    center: [128, 152],
  },
  "3d": {
    back: "M20 62 Q20 46 36 46 H96 Q104 46 110 54 L118 64 H212 Q228 64 228 80 V196 Q228 210 214 210 H36 Q20 210 20 196 Z",
    paper: "M40 76 H206 Q212 76 212 82 V170 H40 Z",
    front: "M52 102 H236 Q250 102 246 116 L226 200 Q223 210 210 210 H38 Q24 210 26 198 L40 112 Q42 102 52 102 Z",
    center: [136, 156],
  },
  outline: {
    back: "M28 66 Q28 52 42 52 H100 Q108 52 114 59 L121 68 H214 Q228 68 228 82 V190 Q228 204 214 204 H42 Q28 204 28 190 Z",
    front: "M28 100 Q28 90 38 90 H218 Q228 90 228 100 V190 Q228 204 214 204 H42 Q28 204 28 190 Z",
    center: [128, 148],
  },
};

const EMOJI_FONT = `"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
const TEXT_FONT = `system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;

export function mainColor(fill: Fill): string {
  return fill.type === "solid" ? fill.color : fill.from;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paintDef(id: string, fill: Fill): { def: string; paint: string } {
  if (fill.type === "solid") return { def: "", paint: fill.color };
  if (fill.type === "linear") {
    const a = (fill.angle * Math.PI) / 180;
    const dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    const f = (n: number) => n.toFixed(3);
    return {
      def: `<linearGradient id="${id}" x1="${f(0.5 - dx)}" y1="${f(0.5 - dy)}" x2="${f(0.5 + dx)}" y2="${f(0.5 + dy)}"><stop offset="0" stop-color="${fill.from}"/><stop offset="1" stop-color="${fill.to}"/></linearGradient>`,
      paint: `url(#${id})`,
    };
  }
  return {
    def: `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="${fill.from}"/><stop offset="1" stop-color="${fill.to}"/></radialGradient>`,
    paint: `url(#${id})`,
  };
}

export function renderSkinSvg(skin: Skin, uid = skin.id): string {
  const p = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { fill: `${p}-f`, gloss: `${p}-g`, shadow: `${p}-s`, glow: `${p}-w`, clip: `${p}-c` };
  const geo = GEOMETRY[skin.shape];
  const main = mainColor(skin.fill);
  const back = skin.accent ?? darken(main, 0.22);
  const { def: fillDef, paint } = paintDef(ids.fill, skin.fill);
  const defs: string[] = [fillDef];
  const filters: string[] = [];

  if (skin.effects.shadow) {
    defs.push(`<filter id="${ids.shadow}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.32"/></filter>`);
    filters.push(ids.shadow);
  }
  if (skin.effects.glow) {
    defs.push(`<filter id="${ids.glow}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  }

  const body: string[] = [];
  const art = skin.artwork;

  if (art?.fit === "full") {
    body.push(`<image href="${esc(art.dataUrl)}" x="8" y="8" width="240" height="240" preserveAspectRatio="xMidYMid meet"/>`);
  } else {
    const isOutline = skin.shape === "outline";
    const glowAttr = skin.effects.glow ? ` filter="url(#${ids.glow})"` : "";
    if (isOutline) {
      body.push(`<g${glowAttr}>`);
      body.push(`<path d="${geo.back}" fill="${main}" fill-opacity="0.12" stroke="${back}" stroke-width="9" stroke-linejoin="round"/>`);
      body.push(`<path d="${geo.front}" fill="${main}" fill-opacity="0.18" stroke="${paint}" stroke-width="9" stroke-linejoin="round"/>`);
      body.push(`</g>`);
    } else {
      body.push(`<g${glowAttr}>`);
      body.push(`<path d="${geo.back}" fill="${back}"/>`);
      if (geo.paper) body.push(`<path d="${geo.paper}" fill="#ffffff" opacity="0.92"/>`);
      body.push(`<path d="${geo.front}" fill="${paint}"/>`);
      body.push(`</g>`);
      if (skin.shape !== "flat") {
        // subtle top highlight on the front lip for depth
        body.push(`<path d="${geo.front}" fill="none" stroke="${lighten(main, 0.35)}" stroke-opacity="0.55" stroke-width="2"/>`);
      }
    }

    if (art?.fit === "cover") {
      defs.push(`<clipPath id="${ids.clip}"><path d="${geo.front}"/></clipPath>`);
      body.push(`<image href="${esc(art.dataUrl)}" x="0" y="80" width="256" height="136" preserveAspectRatio="xMidYMid slice" clip-path="url(#${ids.clip})"/>`);
    }

    if (skin.effects.gloss) {
      defs.push(`<linearGradient id="${ids.gloss}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
      body.push(`<path d="${geo.front}" fill="url(#${ids.gloss})"/>`);
    }

    // badge
    const corner = skin.badgePosition === "bottom-right";
    const [cx, cy] = corner ? [190, 180] : geo.center;
    const scale = skin.badgeScale * (corner ? 0.6 : 1);
    if (art?.fit === "badge") {
      const size = 100 * scale;
      body.push(`<image href="${esc(art.dataUrl)}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`);
    } else if (skin.badge.kind === "emoji") {
      body.push(`<text x="${cx}" y="${cy + 4}" font-size="${(72 * scale).toFixed(1)}" font-family='${EMOJI_FONT}' text-anchor="middle" dominant-baseline="central">${esc(skin.badge.value)}</text>`);
    } else if (skin.badge.kind === "text") {
      const len = [...skin.badge.value].length;
      const size = 64 * scale * Math.pow(2 / Math.max(2, len), 0.7);
      body.push(`<text x="${cx}" y="${cy + 4}" font-size="${size.toFixed(1)}" font-weight="800" font-family='${TEXT_FONT}' fill="${skin.badge.color}" text-anchor="middle" dominant-baseline="central">${esc(skin.badge.value)}</text>`);
    }
  }

  const groupFilter = filters.length ? ` filter="url(#${filters[0]})"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><defs>${defs.join("")}</defs><g${groupFilter}>${body.join("")}</g></svg>`;
}
