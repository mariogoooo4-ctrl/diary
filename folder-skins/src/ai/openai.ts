import { errorText, httpFetch } from "./http";
import { ProviderError, type ImageProvider } from "./types";

const BASE = "https://api.openai.com/v1/images";

export const openaiProvider: ImageProvider = {
  id: "openai",
  label: "OpenAI Images",
  defaultModel: "gpt-image-1",
  modelHint: "Any OpenAI image model id that supports edits, e.g. gpt-image-1.",
  keyUrl: "https://platform.openai.com/api-keys",
  supportsTransparency: true,
  async generate({ prompt, apiKey, model, count, reference, signal }) {
    const n = Math.max(1, Math.min(4, count));
    let res: Response;
    if (reference) {
      // Image-to-image: keep the folder silhouette of the reference.
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt);
      form.append("n", String(n));
      form.append("size", "1024x1024");
      form.append("background", "transparent");
      form.append("image", reference, "folder.png");
      res = await httpFetch(`${BASE}/edits`, { method: "POST", signal, headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    } else {
      res = await httpFetch(`${BASE}/generations`, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, prompt, n, size: "1024x1024", background: "transparent", output_format: "png" }),
      });
    }
    if (!res.ok) throw new ProviderError("OpenAI", await errorText(res), res.status);
    const json = await res.json();
    const images: string[] = (json?.data ?? []).flatMap((d: { b64_json?: string }) => (d.b64_json ? [`data:image/png;base64,${d.b64_json}`] : []));
    if (!images.length) throw new ProviderError("OpenAI", "No image in response");
    return images;
  },
};
