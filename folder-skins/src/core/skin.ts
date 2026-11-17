import { z } from "zod";

/**
 * A skin is a *declarative* description of a folder icon. It is rendered to SVG
 * (see render.ts), rasterised to PNG, and handed to the native layer to apply.
 * Keeping skins as data (not images) makes them tiny, editable and shareable.
 *
 * Bump SKIN_SCHEMA_VERSION and add a migration in `migrateSkin` when the shape
 * of this schema changes in a non-backwards-compatible way.
 */
export const SKIN_SCHEMA_VERSION = 1;

const hex = z.string().regex(/^#([0-9a-fA-F]{6})$/, "Expected #rrggbb colour");

export const SHAPES = ["classic", "rounded", "flat", "3d", "outline"] as const;
export const ShapeSchema = z.enum(SHAPES);
export type Shape = z.infer<typeof ShapeSchema>;

export const FillSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: hex }),
  z.object({ type: z.literal("linear"), from: hex, to: hex, angle: z.number().min(0).max(360) }),
  z.object({ type: z.literal("radial"), from: hex, to: hex }),
]);
export type Fill = z.infer<typeof FillSchema>;
export type FillType = Fill["type"];

export const BadgeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("emoji"), value: z.string().min(1).max(16) }),
  z.object({ kind: z.literal("text"), value: z.string().min(1).max(4), color: hex }),
]);
export type Badge = z.infer<typeof BadgeSchema>;

export const BADGE_POSITIONS = ["center", "bottom-right"] as const;

export const ARTWORK_FITS = ["badge", "cover", "full"] as const;
export const ArtworkSchema = z.object({
  /** data:image/png;base64,... (embedded so packs are self-contained) */
  dataUrl: z.string().startsWith("data:image/"),
  /** badge = small image on the folder, cover = fills the folder front, full = replaces the whole icon */
  fit: z.enum(ARTWORK_FITS),
});
export type Artwork = z.infer<typeof ArtworkSchema>;

export const SkinSchema = z.object({
  schemaVersion: z.literal(SKIN_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  tags: z.array(z.string()).default([]),
  shape: ShapeSchema,
  fill: FillSchema,
  /** Colour of the back panel / tab. Derived from the fill when omitted. */
  accent: hex.optional(),
  badge: BadgeSchema,
  badgePosition: z.enum(BADGE_POSITIONS),
  badgeScale: z.number().min(0.3).max(2),
  artwork: ArtworkSchema.optional(),
  effects: z.object({
    shadow: z.boolean(),
    gloss: z.boolean(),
    glow: z.boolean(),
  }),
});
export type Skin = z.infer<typeof SkinSchema>;

export function newId(prefix = "skin"): string {
  const rnd = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${rnd}`;
}

export function defaultSkin(overrides: Partial<Skin> = {}): Skin {
  return {
    schemaVersion: SKIN_SCHEMA_VERSION,
    id: newId(),
    name: "My skin",
    tags: [],
    shape: "classic",
    fill: { type: "solid", color: "#4f8cff" },
    badge: { kind: "none" },
    badgePosition: "center",
    badgeScale: 1,
    effects: { shadow: true, gloss: false, glow: false },
    ...overrides,
  };
}

/** Upgrade older skin JSON to the current schema. Add cases as versions grow. */
export function migrateSkin(raw: unknown): unknown {
  return raw;
}

export function parseSkin(raw: unknown): Skin {
  return SkinSchema.parse(migrateSkin(raw));
}
