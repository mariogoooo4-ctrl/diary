export interface GenerateRequest {
  /** Fully-built prompt (see recipes.ts). */
  prompt: string;
  apiKey: string;
  model: string;
  /** Number of variations to return (1–4). */
  count: number;
  /**
   * Optional reference image (PNG of a plain folder on white). When given,
   * providers run image-to-image so the result keeps the folder silhouette.
   */
  reference?: Blob;
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
  /** True if the provider can return transparent backgrounds. Otherwise the UI cuts out the white background. */
  supportsTransparency: boolean;
  /** Returns data:image/png;base64 URLs, one per variation. */
  generate(req: GenerateRequest): Promise<string[]>;
}

export class ProviderError extends Error {
  constructor(public provider: string, message: string, public status?: number) {
    super(`${provider}: ${message}`);
  }
}
