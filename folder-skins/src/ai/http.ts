import { isTauri } from "../platform/api";

/**
 * In the desktop app requests go through tauri-plugin-http (Rust side) which
 * avoids browser CORS limits. In browser preview mode we fall back to fetch.
 */
export async function httpFetch(input: string, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch } = await import("@tauri-apps/plugin-http");
    return fetch(input, init);
  }
  return fetch(input, init);
}

export async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? body?.message ?? body?.errors?.join?.(", ") ?? JSON.stringify(body);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}
