import type { Artwork } from "../core/skin";

/**
 * Prompt recipes. "Object folders" use a three-part structure that works well
 * with image-to-image models given a plain folder as reference:
 *   1. base   – keep the folder shape exactly, change only material/texture
 *   2. object – what the folder is made of
 *   3. vibe   – materials, textures and realism details
 * plus guard rails ("build the folder FROM the object", "no text/branding").
 */

export const ART_STYLES = {
  flat: "flat vector illustration, bold simple shapes, clean edges",
  "3d": "glossy 3D render, soft studio lighting",
  pixel: "crisp pixel art, limited palette",
  watercolor: "soft watercolor painting",
  neon: "glowing neon line art on dark background",
} as const;
export type ArtStyle = keyof typeof ART_STYLES;

export interface Vibe {
  id: string;
  label: string;
  details: string;
}

export const VIBES: Vibe[] = [
  { id: "hyperreal", label: "Hyper-real", details: "photorealistic product shot, physically accurate materials, crisp micro-detail, soft studio light, subtle contact shadow, unsettling realism" },
  { id: "grocery", label: "Grocery", details: "supermarket packaging materials, foam tray, tight plastic wrap, condensation droplets, price label sticker, harsh fluorescent light" },
  { id: "junk", label: "Junk food", details: "greasy cardboard, oil stains, crumbs, sauce smears, takeaway packaging, slightly crushed corners" },
  { id: "industrial", label: "Industrial", details: "scratched brushed steel, rivets, worn paint, dents, grime in the seams, heavy-duty hardware" },
  { id: "retro-tech", label: "Retro tech", details: "1980s consumer electronics, chunky plastic, chrome trim, LCD segments, tiny screws, slightly yellowed casing" },
  { id: "nature", label: "Organic", details: "made of natural materials, moss, bark, stone or leaves, fine organic texture, soft daylight" },
  { id: "toy", label: "Toy", details: "glossy injection-molded plastic toy, rounded edges, bright saturated colours, playful and chunky" },
  { id: "gross", label: "Gross", details: "rotting and forgotten, mould spots, sticky residue, wilted edges, disgusting but photorealistic" },
];

/** Starter ideas for the "Surprise me" button. */
export const OBJECT_IDEAS = [
  "takeaway noodle box", "bank vault door", "aquarium with a tiny shipwreck", "ziplock bag of old keys and coins",
  "crushed soda cans", "lunchbox labelled leftovers", "vacuum-packed cheese wedge", "cassette tape case",
  "ice cube tray", "toolbox full of screws", "bento box", "terrarium with ferns", "cardboard box sealed with duct tape",
  "pizza box", "vintage suitcase covered in travel stickers", "egg carton", "first aid kit", "glass jar of pickles",
  "chocolate bar in torn foil", "lego brick", "slice of toast with butter", "denim with patches", "wooden crate of oranges",
  "radioactive waste container", "jewellery box with velvet lining", "mailbox stuffed with letters", "waffle", "bubble wrap",
];

export const randomIdea = () => OBJECT_IDEAS[Math.floor(Math.random() * OBJECT_IDEAS.length)];

export function buildObjectFolderPrompt(object: string, details: string, hasReference: boolean): string {
  const base = hasReference
    ? "Create an alternative of this folder icon keeping exactly the same folder shape, size and proportions, changing only its material and texture."
    : "A single macOS-style desktop folder icon, classic folder silhouette with a tab, front three-quarter view.";
  return [
    base,
    `The folder is ${object.trim()} — build the folder itself out of it, do not paste the object inside a normal folder.`,
    details.trim(),
    "Centered, isolated on a plain white background, no text, no logos, no branding, no extra objects.",
  ].filter(Boolean).join(" ");
}

/** Wraps an idea in instructions for artwork that is placed ON a drawn folder. */
export function buildArtworkPrompt(idea: string, fit: Artwork["fit"], style: ArtStyle): string {
  const s = ART_STYLES[style];
  const subject = idea.trim();
  switch (fit) {
    case "full":
      return `A desktop folder icon themed around: ${subject}. ${s}. Single folder, centered, square composition, no text, plain white background.`;
    case "cover":
      return `A wide decorative pattern or scene of: ${subject}. ${s}. Fills the frame edge to edge, no text.`;
    default:
      return `A single small icon of: ${subject}. ${s}. Centered, readable at small sizes, no text, plain white background.`;
  }
}
