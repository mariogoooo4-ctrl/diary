export interface GenerateRequest {
  /** Fully-built prompt (see buildPrompt). */
  prompt: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}

/**
 * An image generation backend. To add one (e.g. a self-hosted proxy, Replicate,
 * a local Stable Diffusion server): implement this interface in a new file and
 * register it in ./index.ts. Remember to allow its host in
 * src-tauri/capabilities/default.json (http permission scope).
 */
export interface ImageProvider {
  id: string;
  label: string;
  defaultModel: string;
  /** Short help text shown under the model field. */
  modelHint: string;
  /** Where users obtain an API key. */
  keyUrl: string;
  /** True if the provider can return transparent backgrounds (best for badge/full fits). */
  supportsTransparency: boolean;
  /** Returns a data:image/png;base64 URL. */
  generate(req: GenerateRequest): Promise<string>;
}

export class ProviderError extends Error {
  constructor(public provider: string, message: string, public status?: number) {
    super(`${provider}: ${message}`);
  }
}
