import { en, type MessageKey, type Messages } from "./locales/en";

export type { MessageKey };

/** Register locales here. */
const LOCALES: Record<string, Partial<Messages>> = { en };

let current: Partial<Messages> = en;

export function setLocale(code: string) {
  current = LOCALES[code] ?? en;
}

export const availableLocales = () => Object.keys(LOCALES);

/** Translate a key, interpolating {placeholders}. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = current[key] ?? en[key] ?? key;
  return vars ? template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : template;
}
