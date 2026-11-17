import { errorText, httpFetch } from "./http";
import { ProviderError, type ImageProvider } from "./types";

export const openaiProvider: ImageProvider = {
  id: "openai",
  label: "OpenAI Images",
  defaultModel: "gpt-image-1",
  modelHint: "Any OpenAI image model id, e.g. gpt-image-1.",
  keyUrl: "https://platform.openai.com/api-keys",
  supportsTransparency: true,
  async generate({ prompt, apiKey, model, signal }) {
    const res = await httpFetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, n: 1, size: "1024x1024", background: "transparent", output_format: "png" }),
    });
    if (!res.ok) throw new ProviderError("OpenAI", await errorText(res), res.status);
    const json = await res.json();
    const item = json?.data?.[0];
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    throw new ProviderError("OpenAI", "No image in response");
  },
};
