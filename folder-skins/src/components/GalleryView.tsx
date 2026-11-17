import { useMemo, useState } from "react";
import { allPacks, useApp } from "../state/store";
import { USER_PACK_ID } from "../core/packs";
import { t } from "../i18n";
import { SkinCard } from "./SkinCard";
import { TargetFolderBar } from "./TargetFolderBar";

export function GalleryView() {
  const { userSkins, importedPacks, openEditor } = useApp();
  const packs = useMemo(() => allPacks({ userSkins, importedPacks }), [userSkins, importedPacks]);
  const [packFilter, setPackFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(96);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packs
      .filter((p) => packFilter === "all" || p.id === packFilter)
      .map((p) => ({
        pack: p,
        skins: p.skins.filter((s) => !q || s.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || s.tags.some((tag) => tag.includes(q))),
      }))
      .filter((s) => s.skins.length > 0 || (s.pack.id === USER_PACK_ID && packFilter === USER_PACK_ID));
  }, [packs, packFilter, query]);

  return (
    <div className="view">
      <TargetFolderBar />
      <div className="toolbar">
        <div className="chips">
          <button className={`chip ${packFilter === "all" ? "active" : ""}`} onClick={() => setPackFilter("all")}>{t("gallery.all")}</button>
          {packs.map((p) => (
            <button key={p.id} className={`chip ${packFilter === p.id ? "active" : ""}`} onClick={() => setPackFilter(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <input className="search" placeholder={t("gallery.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="zoom" title={t("gallery.zoom")}>
          <span>▫</span>
          <input type="range" min={64} max={160} step={8} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          <span>◻</span>
        </label>
        <button className="btn primary" onClick={() => openEditor()}>＋ {t("gallery.new")}</button>
      </div>

      {userSkins.length === 0 && !query && (packFilter === "all" || packFilter === USER_PACK_ID) && (
        <div className="cta">
          <div className="cta-art">🍕📦🐠</div>
          <div className="cta-text">
            <strong>{t("gallery.ctaTitle")}</strong>
            <span className="muted">{t("gallery.ctaBody")}</span>
          </div>
          <button className="btn primary" onClick={() => openEditor()}>✨ {t("gallery.ctaButton")}</button>
        </div>
      )}

      {sections.length === 0 && <div className="empty">{t("gallery.empty")}</div>}

      {sections.map(({ pack, skins }) => (
        <section key={pack.id} className="pack-section">
          <header>
            <h2>{pack.name}</h2>
            <span className="muted">{pack.description}</span>
          </header>
          {skins.length === 0 ? (
            <div className="empty">
              {t("gallery.emptyMine")}{" "}
              <button className="btn link" onClick={() => openEditor()}>{t("gallery.createFirst")}</button>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${zoom + 52}px, 1fr))` }}>
              {skins.map((s) => <SkinCard key={s.id} skin={s} own={pack.id === USER_PACK_ID} size={zoom} />)}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
