import { useRef, useState } from "react";
import {
  ART_STYLES, VIBES, buildArtworkPrompt, buildObjectFolderPrompt, getProvider, randomIdea, type ArtStyle,
} from "../ai";
import { cutoutIfNeeded, folderReferencePng, normalizeImage } from "../core/rasterize";
import type { Artwork, Skin } from "../core/skin";
import { errMsg, useApp } from "../state/store";
import { t, type MessageKey } from "../i18n";
import { Field, Section, Segmented } from "./controls";

type Mode = "object" | "artwork";

/**
 * AI generation.
 * - "object": turns the whole folder into a hyper-real object (image-to-image
 *   from the current folder shape), used as the full icon.
 * - "artwork": generates an image placed on the drawn folder (badge/cover/full).
 */
export function AiPanel({ draft, fit, onUse }: { draft: Skin; fit: Artwork["fit"]; onUse: (dataUrl: string, fit: Artwork["fit"]) => void }) {
  const { settings, setView, notify } = useApp();
  const provider = getProvider(settings.providerId);
  const apiKey = settings.apiKeys[provider.id] ?? "";
  const model = settings.models[provider.id] || provider.defaultModel;

  const [mode, setMode] = useState<Mode>("object");
  const [idea, setIdea] = useState("");
  const [vibeId, setVibeId] = useState(VIBES[0].id);
  const [details, setDetails] = useState(VIBES[0].details);
  const [style, setStyle] = useState<ArtStyle>("flat");
  const [useShape, setUseShape] = useState(true);
  const [count, setCount] = useState(2);
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const pickVibe = (id: string) => {
    setVibeId(id);
    setDetails(VIBES.find((v) => v.id === id)?.details ?? "");
  };

  const generate = async () => {
    if (!idea.trim()) return;
    abort.current = new AbortController();
    setRunning(true);
    setResults([]);
    try {
      const reference = mode === "object" && useShape ? await folderReferencePng(draft) : undefined;
      const prompt = mode === "object"
        ? buildObjectFolderPrompt(idea, details, !!reference)
        : buildArtworkPrompt(idea, fit, style);
      const raw = await provider.generate({ prompt, apiKey, model, count, reference, signal: abort.current.signal });
      const cleaned = await Promise.all(raw.map(async (r) => normalizeImage(fit === "cover" && mode === "artwork" ? r : await cutoutIfNeeded(r))));
      setResults(cleaned);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") notify(errMsg(e), "error");
    } finally {
      setRunning(false);
    }
  };

  const use = (dataUrl: string) => {
    onUse(dataUrl, mode === "object" ? "full" : fit);
    notify(t("ai.done"), "success");
  };

  return (
    <Section title={`✨ ${t("ai.title")}`}>
      {!apiKey ? (
        <div className="notice">
          {t("ai.noKey", { provider: provider.label })}{" "}
          <button className="btn link" onClick={() => setView("settings")}>{t("ai.openSettings")}</button>
        </div>
      ) : (
        <>
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[{ value: "object", label: t("ai.mode.object") }, { value: "artwork", label: t("ai.mode.artwork") }]}
          />
          <p className="muted small">{t(mode === "object" ? "ai.mode.objectHelp" : "ai.mode.artworkHelp")}</p>

          <Field label={t(mode === "object" ? "ai.object" : "ai.prompt")}>
            <div className="row">
              <input
                value={idea}
                placeholder={t(mode === "object" ? "ai.objectPlaceholder" : "ai.placeholder")}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !running && generate()}
                disabled={running}
              />
              <button className="btn ghost" title={t("ai.surprise")} onClick={() => setIdea(randomIdea())} disabled={running}>🎲</button>
            </div>
          </Field>

          {mode === "object" ? (
            <>
              <Field label={t("ai.vibe")}>
                <div className="chips">
                  {VIBES.map((v) => (
                    <button key={v.id} className={`chip ${vibeId === v.id ? "active" : ""}`} onClick={() => pickVibe(v.id)}>{v.label}</button>
                  ))}
                </div>
              </Field>
              <Field label={t("ai.details")}>
                <textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} disabled={running} />
              </Field>
              <label className="toggle">
                <input type="checkbox" checked={useShape} onChange={(e) => setUseShape(e.target.checked)} />
                <span>{t("ai.useShape")}</span>
              </label>
            </>
          ) : (
            <Field label={t("ai.style")}>
              <Segmented
                value={style}
                onChange={setStyle}
                options={(Object.keys(ART_STYLES) as ArtStyle[]).map((s) => ({ value: s, label: t(`ai.style.${s}` as MessageKey) }))}
              />
            </Field>
          )}

          <div className="row wrap">
            <Field label={t("ai.count")}>
              <Segmented<string> value={String(count)} onChange={(v) => setCount(Number(v))} options={["1", "2", "4"].map((v) => ({ value: v, label: v }))} />
            </Field>
            {running ? (
              <>
                <button className="btn primary" disabled><span className="spinner small" /> {t("ai.generating")}</button>
                <button className="btn ghost" onClick={() => abort.current?.abort()}>{t("ai.cancel")}</button>
              </>
            ) : (
              <button className="btn primary" disabled={!idea.trim()} onClick={generate}>{t("ai.generate")}</button>
            )}
          </div>
          <span className="muted small">{t("ai.using", { provider: provider.label, model })}</span>

          {results.length > 0 && (
            <div className="ai-results">
              {results.map((r, i) => (
                <button key={i} className="ai-result" onClick={() => use(r)} title={t("ai.useThis")}>
                  <img src={r} alt="" />
                  <span>{t("ai.useThis")}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
