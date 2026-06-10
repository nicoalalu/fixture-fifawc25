import type { TeamForm } from "../types";
import { getTeam } from "../store";
import { Flag, ResultDot } from "./ui";

function fmtFecha(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/** §7.2 — Últimos 10 partidos con semáforo: tira compacta + lista detallada. */
export function FormStrip({ form }: { form: TeamForm }) {
  const { ultimos } = form;

  if (ultimos.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No hay partidos recientes para esta selección.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Racha compacta de los últimos N (de más reciente a más antiguo). */}
      <div className="flex flex-wrap items-center gap-1">
        {ultimos.map((p) => (
          <ResultDot
            key={p.match.id}
            r={p.resultado}
            title={`${fmtFecha(p.match.fecha)} · ${getTeam(p.rivalId)?.nombre ?? ""}`}
          />
        ))}
        <span className="ml-1 text-xs text-slate-400">
          (de más reciente a más antiguo)
        </span>
      </div>

      {/* Lista detallada. */}
      <ul className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
        {ultimos.map((p) => {
          const rival = getTeam(p.rivalId);
          return (
            <li
              key={p.match.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <ResultDot r={p.resultado} />
              <span className="font-mono tabular-nums w-10 text-center font-semibold">
                {p.golesFavor}–{p.golesContra}
              </span>
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-xs text-slate-500">
                  {p.esLocal ? "vs" : "@"}
                </span>
                {rival && <Flag team={rival} className="text-base" />}
                <span className="truncate">{rival?.nombre ?? p.rivalId}</span>
              </span>
              <span className="hidden sm:block text-xs text-slate-400 truncate max-w-[40%]">
                {p.match.competicion}
              </span>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {fmtFecha(p.match.fecha)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
