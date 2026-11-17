import { findSkin, useApp } from "../state/store";
import { t } from "../i18n";
import { SkinPreview } from "./SkinPreview";

export function AppliedView() {
  const state = useApp();
  const { applied, applySkin, revertFolder, platform } = state;

  return (
    <div className="view">
      <h2>{t("applied.title")}</h2>
      {!platform.supported && <div className="notice">{t("unsupported", { os: platform.os })}</div>}
      {applied.length === 0 ? (
        <div className="empty">{t("applied.empty")}</div>
      ) : (
        <div className="applied-list">
          {applied.map((a) => {
            const skin = findSkin(state, a.skinId);
            return (
              <div key={a.folder} className="applied-row">
                {skin ? <SkinPreview skin={skin} size={48} /> : <div className="skin-preview placeholder" />}
                <div className="applied-info">
                  <div className="applied-path" title={a.folder}>{a.folder}</div>
                  <div className="muted small">
                    {skin ? a.skinName : `${a.skinName} ${t("applied.missing")}`} · {new Date(a.appliedAt).toLocaleString()}
                  </div>
                </div>
                <div className="row">
                  <button className="btn small" disabled={!skin || !platform.supported} onClick={() => skin && applySkin(skin, a.folder)}>{t("applied.reapply")}</button>
                  <button className="btn small ghost" disabled={!platform.supported} onClick={() => revertFolder(a.folder)}>{t("applied.revert")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
