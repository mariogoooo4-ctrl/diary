import { useApp } from "../state/store";
import { pickFolder } from "../platform/api";
import { t } from "../i18n";

export function TargetFolderBar() {
  const { targetFolder, setTargetFolder, applied, revertFolder, platform } = useApp();
  const current = targetFolder ? applied.find((a) => a.folder === targetFolder) : undefined;

  const choose = async () => {
    const f = await pickFolder();
    if (f) setTargetFolder(f);
  };

  return (
    <div className={`target-bar ${targetFolder ? "has-target" : ""}`}>
      <div className="target-icon">📁</div>
      <div className="target-info">
        <div className="target-label">{t("target.label")}</div>
        {targetFolder ? (
          <>
            <div className="target-path" title={targetFolder}>{targetFolder}</div>
            {current && <div className="target-sub">{t("target.current", { name: current.skinName })}</div>}
          </>
        ) : (
          <div className="target-sub">{t("target.none")}</div>
        )}
        {!platform.supported && <div className="target-warn">{t("unsupported", { os: platform.os })}</div>}
      </div>
      <div className="target-actions">
        {current && (
          <button className="btn ghost" onClick={() => revertFolder(current.folder)}>{t("target.revert")}</button>
        )}
        {targetFolder && <button className="btn ghost" onClick={() => setTargetFolder(null)}>{t("target.clear")}</button>}
        <button className="btn primary" onClick={choose}>{targetFolder ? t("target.change") : t("target.choose")}</button>
      </div>
    </div>
  );
}

