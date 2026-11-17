import { useRef, useState } from "react";
import { ART_STYLES, buildPrompt, getProvider, type ArtStyle } from "../ai";
import { normalizeImage } from "../core/rasterize";
import type { Artwork } from "../core/skin";
import { errMsg, useApp } from "../state/store";
import { t, type MessageKey } from "../i18n";
import { Field, Section, Segmented } from "./controls";

export function AiPanel({ fit, onImage }: { fit: Artwork["fit"]; onImage: (dataUrl: string) => void }) {
  const { settings, setView, notify } = useApp();
  const provider = getProvider(settings.providerId);
  const apiKey = settings.apiKeys[provider.id] ?? "";
  const model = settings.models[provider.id] || provider.defaultModel;
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<ArtStyle>("flat");
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!idea.trim()) return;
    abort.current = new AbortController();
    setRunning(true);
    try {
      const raw = await provider.generate({ prompt: buildPrompt(idea, fit, style), apiKey, model, signal: abort.current.signal });
      onImage(await normalizeImage(raw));
      notify(t("ai.done"), "success");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") notify(errMsg(e), "error");
    } finally {
      setRunning(false);
    }
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
          <Field label={t("ai.prompt")}>
            <textarea rows={2} value={idea} placeholder={t("ai.placeholder")} onChange={(e) => setIdea(e.target.value)} disabled={running} />
          </Field>
          <Field label={t("ai.style")}>
            <Segmented
              value={style}
              onChange={setStyle}
              options={(Object.keys(ART_STYLES) as ArtStyle[]).map((s) => ({ value: s, label: t(`ai.style.${s}` as MessageKey) }))}
            />
          </Field>
          <div className="row">
            {running ? (
              <>
                <button className="btn primary" disabled><span className="spinner small" /> {t("ai.generating")}</button>
                <button className="btn ghost" onClick={() => abort.current?.abort()}>{t("ai.cancel")}</button>
              </>
            ) : (
              <button className="btn primary" disabled={!idea.trim()} onClick={generate}>{t("ai.generate")}</button>
            )}
            <span className="muted small">{t("ai.using", { provider: provider.label, model })}</span>
          </div>
        </>
      )}
    </Section>
  );
}
