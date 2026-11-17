import { z } from "zod";
import { SkinSchema, migrateSkin, newId, type Skin } from "./skin";

/**
 * A pack is a named collection of skins. Built-in themes are packs, the user's
 * own skins form the "mine" pack, and `.fskin` files are serialised packs.
 * The same shape can later be served by an online gallery/marketplace.
 */
export const PACK_FILE_FORMAT = "folderskins.pack";
export const PACK_FILE_VERSION = 1;
export const PACK_EXTENSION = "fskin";
export const USER_PACK_ID = "mine";

export const PackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  description: z.string().max(280).default(""),
  author: z.string().max(60).optional(),
  builtin: z.boolean().default(false),
  skins: z.array(SkinSchema),
});
export type Pack = z.infer<typeof PackSchema>;

const PackFileSchema = z.object({
  format: z.literal(PACK_FILE_FORMAT),
  version: z.number().int().min(1).max(PACK_FILE_VERSION),
  pack: z.unknown(),
});

export function serializePack(pack: Pack): string {
  const { builtin: _builtin, ...rest } = pack;
  return JSON.stringify({ format: PACK_FILE_FORMAT, version: PACK_FILE_VERSION, pack: rest }, null, 2);
}

/**
 * Parse a `.fskin` file. Imported packs and skins get fresh ids so importing the
 * same file twice (or a pack that collides with a built-in) never clobbers data.
 */
export function parsePackFile(text: string): Pack {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Not a valid .fskin file (invalid JSON)");
  }
  const file = PackFileSchema.parse(json);
  const rawPack = file.pack as { skins?: unknown[] } & Record<string, unknown>;
  const pack = PackSchema.parse({
    ...rawPack,
    skins: (rawPack.skins ?? []).map(migrateSkin),
  });
  return {
    ...pack,
    id: newId("pack"),
    builtin: false,
    skins: pack.skins.map((s: Skin) => ({ ...s, id: newId() })),
  };
}
