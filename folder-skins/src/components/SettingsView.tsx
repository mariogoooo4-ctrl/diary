import { PROVIDERS, getProvider } from "../ai";
import { PACK_EXTENSION, USER_PACK_ID, parsePackFile, serializePack, type Pack } from "../core/packs";
import { confirmAsk, openExternal, openTextFile, saveTextFile } from "../platform/api";
import { errMsg, useApp } from "../state/store";
import { t } from "../i18n";
import { Field, Section } from "./controls";

export function SettingsView() {
  const { settings, updateSettings, importedPacks, importPack, removePack, userSkins, notify, platform } = useApp();
  const provider = getProvider(settings.providerId);

  const doImport = async () => {
    try {
      const text = await openTextFile([PACK_EXTENSION, "json"]);
      if (text) importPack(parsePackFile(text));
    } catch (e) {
      notify(`Import failed: ${errMsg(e)}`, "error");
    }
  };

  const doExport = async (pack: Pack) => {
    try {
      const file = `${pack.name.replace(/[^\w -]/g, "") || "pack"}.${PACK_EXTENSION}`;
      if (await saveTextFile(file, serializePack(pack), [PACK_EXTENSION])) notify(`Exported “${pack.name}”`, "success");
    } catch (e) {
      notify(`Export failed: ${errMsg(e)}`, "error");
    }
  };

  const mine: Pack = { id: USER_PACK_ID, name: "My Skins", description: "", builtin: false, skins: userSkins };

  return (
    <div className="view settings">
      <h2>{t("settings.title")}</h2>

      <Section title={t("settings.ai")}>
        <p className="muted small">{t("settings.aiHelp")}</p>
        <Field label={t("settings.provider")}>
          <select value={provider.id} onChange={(e) => updateSettings({ providerId: e.target.value })}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label={t("settings.apiKey")}>
          <div className="row">
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={settings.apiKeys[provider.id] ?? ""}
              placeholder="sk-…"
              onChange={(e) => updateSettings({ apiKeys: { ...settings.apiKeys, [provider.id]: e.target.value.trim() } })}
            />
            <button className="btn ghost" onClick={() => openExternal(provider.keyUrl)}>{t("settings.getKey")}</button>
          </div>
        </Field>
        <Field label={t("settings.model")}>
          <input
            value={settings.models[provider.id] ?? provider.defaultModel}
            onChange={(e) => updateSettings({ models: { ...settings.models, [provider.id]: e.target.value.trim() } })}
          />
        </Field>
        <div className="muted small">{provider.modelHint}</div>
      </Section>

      <Section title={t("settings.packs")}>
        <p className="muted small">{t("settings.packsHelp")}</p>
        <div className="row wrap">
          <button className="btn primary" onClick={doImport}>{t("settings.import")}</button>
          <button className="btn" disabled={userSkins.length === 0} onClick={() => doExport(mine)}>{t("settings.exportMine")}</button>
        </div>
        {importedPacks.length === 0 ? (
          <div className="muted small">{t("settings.noPacks")}</div>
        ) : (
          <div className="pack-list">
            {importedPacks.map((p) => (
              <div key={p.id} className="pack-row">
                <div>
                  <strong>{p.name}</strong> <span className="muted small">{t("common.skins", { count: p.skins.length })}</span>
                  {p.description && <div className="muted small">{p.description}</div>}
                </div>
                <div className="row">
                  <button className="btn small" onClick={() => doExport(p)}>{t("settings.export")}</button>
                  <button className="btn small ghost danger" onClick={async () => { if (await confirmAsk(t("settings.confirmRemovePack", { name: p.name }))) removePack(p.id); }}>
                    {t("settings.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("settings.about")}>
        <div className="muted small">{t("settings.platform", { os: platform.os })}</div>
        <div className="muted small">{t("settings.applySupported", { value: platform.supported ? t("common.yes") : t("common.no") })}</div>
      </Section>
    </div>
  );
}
