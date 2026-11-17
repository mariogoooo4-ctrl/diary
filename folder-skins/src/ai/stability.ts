import { blobToDataUrl } from "../core/rasterize";
import { errorText, httpFetch } from "./http";
import { ProviderError, type ImageProvider } from "./types";

export const stabilityProvider: ImageProvider = {
  id: "stability",
  label: "Stability AI",
  defaultModel: "core",
  modelHint: "Endpoint: core, ultra, or sd3.",
  keyUrl: "https://platform.stability.ai/account/keys",
  supportsTransparency: false,
  async generate({ prompt, apiKey, model, signal }) {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("output_format", "png");
    form.append("aspect_ratio", "1:1");
    const endpoint = model.replace(/[^a-z0-9-]/gi, "") || "core";
    const res = await httpFetch(`https://api.stability.ai/v2beta/stable-image/generate/${endpoint}`, {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
      body: form,
    });
    if (!res.ok) throw new ProviderError("Stability", await errorText(res), res.status);
    return blobToDataUrl(await res.blob());
  },
};
