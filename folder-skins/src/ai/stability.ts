import { blobToDataUrl } from "../core/rasterize";
import { errorText, httpFetch } from "./http";
import { ProviderError, type ImageProvider } from "./types";

const BASE = "https://api.stability.ai/v2beta/stable-image";

export const stabilityProvider: ImageProvider = {
  id: "stability",
  label: "Stability AI",
  defaultModel: "core",
  modelHint: "Text-to-image endpoint: core, ultra, or sd3. With a folder reference, the Structure control endpoint is used.",
  keyUrl: "https://platform.stability.ai/account/keys",
  supportsTransparency: false,
  async generate({ prompt, apiKey, model, count, reference, signal }) {
    const endpoint = reference ? "control/structure" : `generate/${model.replace(/[^a-z0-9-]/gi, "") || "core"}`;
    const one = async () => {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("output_format", "png");
      if (reference) {
        form.append("image", reference, "folder.png");
        form.append("control_strength", "0.75");
      } else {
        form.append("aspect_ratio", "1:1");
      }
      const res = await httpFetch(`${BASE}/${endpoint}`, {
        method: "POST",
        signal,
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
        body: form,
      });
      if (!res.ok) throw new ProviderError("Stability", await errorText(res), res.status);
      return blobToDataUrl(await res.blob());
    };
    // The API returns one image per call; run variations in parallel.
    return Promise.all(Array.from({ length: Math.max(1, Math.min(4, count)) }, one));
  },
};
