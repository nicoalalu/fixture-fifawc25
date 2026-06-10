import { dataset } from "./lib/dataset";
import { useApp, type Tab } from "./store";
import { SeleccionesTab } from "./components/SeleccionesTab";
import { MundialTab } from "./components/MundialTab";
import { H2HModal } from "./components/H2HModal";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "selecciones", label: "Selecciones", icon: "🌎" },
  { id: "mundial", label: "Mundial 2026", icon: "🏆" },
];

export default function App() {
  const { tab, setTab } = useApp();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-900/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Prode Stats · Mundial 2026
              </h1>
              <p className="text-[11px] text-slate-400">
                48 selecciones · forma, números de 4 años y cara a cara
              </p>
            </div>
            <span className="hidden sm:inline text-2xl" aria-hidden>
              ⚽🇺🇸🇲🇽🇨🇦
            </span>
          </div>

          <nav className="mt-3 flex gap-1" role="tablist" aria-label="Secciones">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={
                  "rounded-xl px-4 py-2 text-sm font-medium transition " +
                  (tab === t.id
                    ? "bg-pitch-500 text-pitch-900"
                    : "text-slate-300 hover:bg-white/10")
                }
              >
                <span className="mr-1" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {tab === "selecciones" ? <SeleccionesTab /> : <MundialTab />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-6 text-center text-[11px] text-slate-500">
        {dataset.meta.fuente === "simulado" ? (
          <p>
            ⚠️ Datos históricos <strong>simulados</strong> (determinista, a partir
            del ranking FIFA) — no son resultados reales. Regenerá el snapshot con{" "}
            <code className="font-mono">API_FOOTBALL_KEY</code> para datos reales.
          </p>
        ) : (
          <p>Datos vía API-Football. Snapshot generado el {dataset.meta.generadoEl.slice(0, 10)}.</p>
        )}
        <p className="mt-1">
          Herramienta de consulta para armar tu prode. No es una app de apuestas.
        </p>
      </footer>

      <H2HModal />
    </div>
  );
}
