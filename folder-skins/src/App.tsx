import { useEffect } from "react";
import { useApp, type View } from "./state/store";
import { onPathsDropped } from "./platform/api";
import { t, type MessageKey } from "./i18n";
import { GalleryView } from "./components/GalleryView";
import { EditorView } from "./components/EditorView";
import { AppliedView } from "./components/AppliedView";
import { SettingsView } from "./components/SettingsView";
import { Toasts } from "./components/Toasts";

const NAV: { view: View; label: MessageKey; icon: string }[] = [
  { view: "gallery", label: "nav.gallery", icon: "▦" },
  { view: "editor", label: "nav.editor", icon: "✎" },
  { view: "applied", label: "nav.applied", icon: "✓" },
  { view: "settings", label: "nav.settings", icon: "⚙" },
];

export default function App() {
  const { ready, view, setView, init, busy, applied } = useApp();

  useEffect(() => {
    void init();
    let unlisten: (() => void) | undefined;
    void onPathsDropped((paths) => {
      if (paths[0]) {
        useApp.getState().setTargetFolder(paths[0]);
        useApp.getState().setView("gallery");
      }
    }).then((u) => (unlisten = u));
    return () => unlisten?.();
  }, [init]);

  if (!ready) return <div className="splash">{t("app.name")}…</div>;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">▰</span>
          <div>
            <div className="brand-name">{t("app.name")}</div>
            <div className="brand-tag">{t("app.tagline")}</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.view} className={`nav-item ${view === n.view ? "active" : ""}`} onClick={() => setView(n.view)}>
              <span className="nav-icon">{n.icon}</span>
              {t(n.label)}
              {n.view === "applied" && applied.length > 0 && <span className="pill">{applied.length}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        {view === "gallery" && <GalleryView />}
        {view === "editor" && <EditorView />}
        {view === "applied" && <AppliedView />}
        {view === "settings" && <SettingsView />}
      </main>
      {busy && (
        <div className="busy-overlay">
          <div className="spinner" />
          <div>{busy}</div>
        </div>
      )}
      <Toasts />
    </div>
  );
}
