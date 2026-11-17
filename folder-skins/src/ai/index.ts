import { openaiProvider } from "./openai";
import { stabilityProvider } from "./stability";
import type { ImageProvider } from "./types";

export * from "./types";
export * from "./recipes";

/** Registry of AI providers. Add new ones here. */
export const PROVIDERS: ImageProvider[] = [openaiProvider, stabilityProvider];

export function getProvider(id: string): ImageProvider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
