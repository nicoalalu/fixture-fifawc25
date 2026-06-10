import { useEffect } from "react";
import { getH2H, getInsight, getTeam, useApp } from "../store";
import type { TonoInsight } from "../types";
import { Flag, ResultDot } from "./ui";

function fmtFecha(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const TONO_STYLE: Record<TonoInsight, string> = {
  favorable: "bg-emerald-500/15 ring-emerald-500/30 text-emerald-100",
  parejo: "bg-amber-400/15 ring-amber-400/30 text-amber-100",
  goleador: "bg-sky-500/15 ring-sky-500/30 text-sky-100",
  "sin-historia": "bg-white/5 ring-white/15 text-slate-200",
};

export function H2HModal() {
  const { cruce, cerrarCruce } = useApp();

  useEffect(() => {
    if (!cruce) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrarCruce();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cruce, cerrarCruce]);

  if (!cruce) return null;
  const a = getTeam(cruce.aId);
  const b = getTeam(cruce.bId);
  if (!a || !b) return null;

  const h2h = getH2H(a.id, b.id);
  const insight = getInsight(a.id, b.id);
  const { resumen, enfrentamientos } = h2h;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={cerrarCruce}
      role="dialog"
      aria-modal="true"
      aria-label={`Cara a cara ${a.nombre} vs ${b.nombre}`}
    >
      <div
        className="card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-white/10 bg-ink-800/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Flag team={a} className="text-2xl" /> {a.codigoFIFA}
            <span className="text-slate-500">vs</span>
            <Flag team={b} className="text-2xl" /> {b.codigoFIFA}
          </div>
          <button
            onClick={cerrarCruce}
            aria-label="Cerrar"
            className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Insight destacado */}
          <div className={"rounded-xl px-4 py-3 ring-1 " + TONO_STYLE[insight.tono]}>
            <div className="text-[11px] uppercase tracking-wide opacity-70">
              Insight del cruce
            </div>
            <p className="mt-0.5 text-sm leading-snug">{insight.texto}</p>
          </div>

          {/* Resumen H2H */}
          {resumen.totalPJ > 0 ? (
            <div className="card p-4">
              <div className="grid grid-cols-3 items-center text-center">
                <div className="min-w-0">
                  <Flag team={a} className="text-2xl" />
                  <div className="text-xs truncate">{a.nombre}</div>
                  <div className="text-3xl font-bold text-emerald-300">
                    {resumen.ganadosA}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">empates</div>
                  <div className="text-3xl font-bold text-amber-200">
                    {resumen.empates}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {resumen.totalPJ} PJ · goles {resumen.golesA}–{resumen.golesB}
                  </div>
                </div>
                <div className="min-w-0">
                  <Flag team={b} className="text-2xl" />
                  <div className="text-xs truncate">{b.nombre}</div>
                  <div className="text-3xl font-bold text-rose-300">
                    {resumen.ganadosB}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center text-slate-300">
              <div className="text-3xl mb-1">🤝</div>
              Primer enfrentamiento de la historia: no hay antecedentes entre{" "}
              {a.nombre} y {b.nombre}.
            </div>
          )}

          {/* Lista de enfrentamientos (perspectiva del equipo A) */}
          {resumen.totalPJ > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Enfrentamientos (vista de {a.nombre})
              </div>
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
                {enfrentamientos.map((p) => (
                  <li
                    key={p.match.id}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <ResultDot r={p.resultado} />
                    <span className="font-mono tabular-nums w-10 text-center font-semibold">
                      {p.golesFavor}–{p.golesContra}
                    </span>
                    <span className="flex-1 truncate text-xs text-slate-400">
                      {p.match.competicion}
                    </span>
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {fmtFecha(p.match.fecha)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
