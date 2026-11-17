import type { ChangeEvent } from "react";
import { SHAPES, type Badge, type Fill, type FillType, type Shape, type Skin } from "../core/skin";
import { mainColor } from "../core/render";
import { darken, lighten, luminance } from "../core/color";
import { normalizeImage, blobToDataUrl } from "../core/rasterize";
import { errMsg, useApp } from "../state/store";
import { t, type MessageKey } from "../i18n";
import { SkinPreview } from "./SkinPreview";
import { AiPanel } from "./AiPanel";
import { ColorInput, Field, Section, Segmented, Toggle } from "./controls";

const EMOJIS = ["📁", "💻", "🎵", "📷", "🎬", "🎮", "📄", "💼", "🎓", "💰", "⬇️", "⭐", "❤️", "🎨", "✈️", "📦",
  "🔒", "🚀", "🔥", "🌈", "🍕", "☕", "🐱", "🐶", "🌲", "🌊", "⚽", "🏠", "📚", "🧪", "🛠️", "💡", "🗂️", "📈", "🎁", "👻"];

const k = (s: string) => s as MessageKey;

export function EditorView() {
  const { draft, updateDraft, saveDraft, openEditor, applySkin, targetFolder, platform, notify } = useApp();

  if (!draft) {
    return (
      <div className="view center">
        <div className="empty big">
          <p>{t("editor.empty")}</p>
          <button className="btn primary" onClick={() => openEditor()}>{t("editor.newBlank")}</button>
        </div>
      </div>
    );
  }

  const setFillType = (type: FillType) => {
    const c = mainColor(draft.fill);
    const second = draft.fill.type === "solid" ? (luminance(c) > 0.5 ? darken(c, 0.4) : lighten(c, 0.35)) : draft.fill.to;
    const fill: Fill = type === "solid" ? { type, color: c } : type === "linear" ? { type, from: c, to: second, angle: 90 } : { type, from: c, to: second };
    updateDraft({ fill });
  };
  const patchFill = (patch: Partial<Record<"color" | "from" | "to" | "angle", string | number>>) =>
    updateDraft({ fill: { ...draft.fill, ...patch } as Fill });

  const setBadgeKind = (kind: Badge["kind"]) => {
    const badge: Badge = kind === "none" ? { kind } : kind === "emoji" ? { kind, value: "⭐" } : { kind, value: "A", color: "#ffffff" };
    updateDraft({ badge });
  };

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await normalizeImage(await blobToDataUrl(file));
      updateDraft({ artwork: { dataUrl, fit: draft.artwork?.fit ?? "badge" } });
    } catch (err) {
      notify(errMsg(err), "error");
    }
  };

  const fit = draft.artwork?.fit ?? "badge";
  const canApply = !!targetFolder && platform.supported;

  return (
    <div className="view editor">
      <div className="editor-preview">
        <h2>{t("editor.title")}</h2>
        <div className="preview-stage">
          <SkinPreview skin={draft} size={240} />
        </div>
        <div className="muted small">{t("editor.sizes")}</div>
        <div className="size-strip">
          {["light", "dark"].map((bg) => (
            <div key={bg} className={`size-row ${bg}`}>
              {[16, 32, 48, 96].map((s) => <SkinPreview key={s} skin={draft} size={s} />)}
            </div>
          ))}
        </div>
        <div className="editor-actions">
          <button className="btn primary" onClick={saveDraft}>{t("editor.save")}</button>
          <button className="btn" disabled={!canApply} title={canApply ? targetFolder! : t("card.applyHint")} onClick={() => targetFolder && applySkin(draft, targetFolder)}>
            {t("editor.applyNow")}
          </button>
          <button className="btn ghost" onClick={() => openEditor()}>{t("editor.reset")}</button>
        </div>
      </div>

      <div className="editor-controls">
        <Field label={t("editor.name")}>
          <input value={draft.name} maxLength={60} onChange={(e) => updateDraft({ name: e.target.value })} />
        </Field>

        <Section title={t("editor.shape")}>
          <div className="shape-picker">
            {SHAPES.map((shape: Shape) => (
              <button key={shape} className={`shape-option ${draft.shape === shape ? "active" : ""}`} onClick={() => updateDraft({ shape })} title={shape}>
                <SkinPreview skin={{ ...draft, shape, badge: { kind: "none" }, artwork: undefined }} size={52} />
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("editor.fill")}>
          <Segmented<FillType>
            value={draft.fill.type}
            onChange={setFillType}
            options={(["solid", "linear", "radial"] as const).map((v) => ({ value: v, label: t(k(`editor.fill.${v}`)) }))}
          />
          <div className="row wrap">
            {draft.fill.type === "solid" ? (
              <Field label={t("editor.color")}><ColorInput value={draft.fill.color} onChange={(color) => patchFill({ color })} /></Field>
            ) : (
              <>
                <Field label={t("editor.from")}><ColorInput value={draft.fill.from} onChange={(from) => patchFill({ from })} /></Field>
                <Field label={t("editor.to")}><ColorInput value={draft.fill.to} onChange={(to) => patchFill({ to })} /></Field>
                {draft.fill.type === "linear" && (
                  <Field label={`${t("editor.angle")} ${draft.fill.angle}°`}>
                    <input type="range" min={0} max={360} value={draft.fill.angle} onChange={(e) => patchFill({ angle: Number(e.target.value) })} />
                  </Field>
                )}
              </>
            )}
          </div>
          <div className="row wrap">
            <Toggle label={`${t("editor.accent")}: ${t("editor.accentAuto")}`} checked={!draft.accent} onChange={(auto) => updateDraft({ accent: auto ? undefined : "#334155" })} />
            {draft.accent && <ColorInput value={draft.accent} onChange={(accent) => updateDraft({ accent })} />}
          </div>
        </Section>

        <Section title={t("editor.badge")}>
          <Segmented<Badge["kind"]>
            value={draft.badge.kind}
            onChange={setBadgeKind}
            options={(["none", "emoji", "text"] as const).map((v) => ({ value: v, label: t(k(`editor.badge.${v}`)) }))}
          />
          {draft.badge.kind === "emoji" && (
            <>
              <div className="emoji-grid">
                {EMOJIS.map((e) => (
                  <button key={e} className={draft.badge.kind === "emoji" && draft.badge.value === e ? "active" : ""} onClick={() => updateDraft({ badge: { kind: "emoji", value: e } })}>{e}</button>
                ))}
              </div>
              <Field label={t("editor.customEmoji")}>
                <input value={draft.badge.value} maxLength={16} onChange={(e) => e.target.value && updateDraft({ badge: { kind: "emoji", value: e.target.value } })} />
              </Field>
            </>
          )}
          {draft.badge.kind === "text" && (
            <div className="row wrap">
              <Field label={t("editor.badgeText")}>
                <input value={draft.badge.value} maxLength={4} onChange={(e) => updateDraft({ badge: { ...(draft.badge as Extract<Badge, { kind: "text" }>), value: e.target.value || "A" } })} />
              </Field>
              <Field label={t("editor.color")}>
                <ColorInput value={draft.badge.color} onChange={(color) => updateDraft({ badge: { ...(draft.badge as Extract<Badge, { kind: "text" }>), color } })} />
              </Field>
            </div>
          )}
          {(draft.badge.kind !== "none" || draft.artwork?.fit === "badge") && (
            <div className="row wrap">
              <Field label={t("editor.badgePosition")}>
                <Segmented<Skin["badgePosition"]>
                  value={draft.badgePosition}
                  onChange={(badgePosition) => updateDraft({ badgePosition })}
                  options={(["center", "bottom-right"] as const).map((v) => ({ value: v, label: t(k(`editor.badgePosition.${v}`)) }))}
                />
              </Field>
              <Field label={`${t("editor.badgeScale")} ${Math.round(draft.badgeScale * 100)}%`}>
                <input type="range" min={0.3} max={2} step={0.05} value={draft.badgeScale} onChange={(e) => updateDraft({ badgeScale: Number(e.target.value) })} />
              </Field>
            </div>
          )}
        </Section>

        <Section title={t("editor.artwork")}>
          <div className="row wrap">
            <label className="btn">
              {t("editor.upload")}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={onUpload} />
            </label>
            {draft.artwork && <button className="btn ghost danger" onClick={() => updateDraft({ artwork: undefined })}>{t("editor.removeImage")}</button>}
          </div>
          {draft.artwork && (
            <Field label={t("editor.fit")}>
              <Segmented
                value={fit}
                onChange={(f) => updateDraft({ artwork: { ...draft.artwork!, fit: f } })}
                options={(["badge", "cover", "full"] as const).map((v) => ({ value: v, label: t(k(`editor.fit.${v}`)) }))}
              />
            </Field>
          )}
        </Section>

        <AiPanel fit={fit} onImage={(dataUrl) => updateDraft({ artwork: { dataUrl, fit } })} />

        <Section title={t("editor.effects")}>
          <div className="row wrap">
            {(["shadow", "gloss", "glow"] as const).map((fx) => (
              <Toggle key={fx} label={t(k(`editor.${fx}`))} checked={draft.effects[fx]} onChange={(v) => updateDraft({ effects: { ...draft.effects, [fx]: v } })} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
