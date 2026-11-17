import type { Artwork } from "../core/skin";
import { openaiProvider } from "./openai";
import { stabilityProvider } from "./stability";
import type { ImageProvider } from "./types";

export * from "./types";

/** Registry of AI providers. Add new ones here. */
export const PROVIDERS: ImageProvider[] = [openaiProvider, stabilityProvider];

export function getProvider(id: string): ImageProvider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export const ART_STYLES = {
  flat: "flat vector illustration, bold simple shapes, clean edges",
  "3d": "glossy 3D render, soft studio lighting",
  pixel: "crisp pixel art, limited palette",
  watercolor: "soft watercolor painting",
  neon: "glowing neon line art on dark background",
} as const;
export type ArtStyle = keyof typeof ART_STYLES;

/** Wraps the user's idea in instructions that produce icon-friendly images. */
export function buildPrompt(idea: string, fit: Artwork["fit"], style: ArtStyle): string {
  const s = ART_STYLES[style];
  const subject = idea.trim();
  switch (fit) {
    case "full":
      return `A desktop folder icon themed around: ${subject}. ${s}. Single folder, centered, square composition, no text, transparent or plain background.`;
    case "cover":
      return `A wide decorative pattern or scene of: ${subject}. ${s}. Fills the frame edge to edge, no text.`;
    default:
      return `A single small icon of: ${subject}. ${s}. Centered, readable at small sizes, no text, transparent background.`;
  }
}
