import type { Skin } from "../core/skin";
import { skinToPngBase64 } from "../core/rasterize";
import { confirmAsk, saveIconFile } from "../platform/api";
import { errMsg, useApp } from "../state/store";
import { t } from "../i18n";
import { SkinPreview } from "./SkinPreview";

export function SkinCard({ skin, own, size = 88 }: { skin: Skin; own: boolean; size?: number }) {
  const { targetFolder, platform, applySkin, openEditor, deleteUserSkin, notify, applied } = useApp();
  const canApply = !!targetFolder && platform.supported;
  const isCurrent = applied.some((a) => a.folder === targetFolder && a.skinId === skin.id);

  const exportIcon = async () => {
    try {
      const png = await skinToPngBase64(skin, 512);
      const ext = platform.os === "windows" ? "ico" : "png";
      if (await saveIconFile(`${skin.name}.${ext}`, png)) notify(`Exported “${skin.name}”`, "success");
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  const remove = async () => {
    if (await confirmAsk(t("card.confirmDelete", { name: skin.name }))) deleteUserSkin(skin.id);
  };

  return (
    <div className={`skin-card ${isCurrent ? "current" : ""}`}>
      <button
        className="skin-card-preview"
        disabled={!canApply}
        title={canApply ? `${t("card.apply")} → ${targetFolder}` : t("card.applyHint")}
        onClick={() => targetFolder && applySkin(skin, targetFolder)}
      >
        <SkinPreview skin={skin} size={size} />
      </button>
      <div className="skin-card-name" title={skin.name}>{skin.name}</div>
      <div className="skin-card-actions">
        <button className="btn small primary" disabled={!canApply} title={canApply ? undefined : t("card.applyHint")} onClick={() => targetFolder && applySkin(skin, targetFolder)}>
          {t("card.apply")}
        </button>
        <button className="btn small ghost" onClick={() => openEditor(skin)} title={own ? t("card.edit") : t("card.customize")}>✎</button>
        <button className="btn small ghost" onClick={exportIcon} title={t("card.export")}>⤓</button>
        {own && <button className="btn small ghost danger" onClick={remove} title={t("card.delete")}>✕</button>}
      </div>
    </div>
  );
}
