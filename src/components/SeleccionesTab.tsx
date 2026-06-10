import { useMemo } from "react";
import { getAllTeams, useApp } from "../store";
import type { Team } from "../types";
import { Flag } from "./ui";
import { TeamFicha } from "./TeamFicha";

const COMBINING = /[̀-ͯ]/g;
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(COMBINING, "");
}

function TeamCard({
  team,
  selected,
  onClick,
}: {
  team: Team;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition " +
        (selected
          ? "border-pitch-500 bg-pitch-500/15"
          : "border-white/10 bg-ink-800/60 hover:border-white/25 hover:bg-ink-700/60")
      }
    >
      <Flag team={team} className="text-2xl" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{team.nombre}</span>
        <span className="block text-[11px] text-slate-400 font-mono">
          {team.codigoFIFA} · Gr. {team.grupo ?? "—"}
        </span>
      </span>
    </button>
  );
}

export function SeleccionesTab() {
  const teams = getAllTeams();
  const { selectedTeamId, selectTeam, filtroTexto, setFiltroTexto } = useApp();

  const grupos = useMemo(() => {
    const q = norm(filtroTexto.trim());
    const filtered = q
      ? teams.filter(
          (t) => norm(t.nombre).includes(q) || norm(t.codigoFIFA).includes(q),
        )
      : teams;
    const map = new Map<string, Team[]>();
    for (const t of filtered) {
      const g = t.grupo ?? "?";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(t);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [teams, filtroTexto]);

  const grid = (
    <div className="space-y-4">
      <input
        type="search"
        value={filtroTexto}
        onChange={(e) => setFiltroTexto(e.target.value)}
        placeholder="Buscar selección…"
        aria-label="Buscar selección"
        className="w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-pitch-500"
      />
      {grupos.length === 0 && (
        <p className="text-sm text-slate-400">Sin resultados para “{filtroTexto}”.</p>
      )}
      {grupos.map(([g, eq]) => (
        <div key={g}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Grupo {g}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {eq.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                selected={t.id === selectedTeamId}
                onClick={() => selectTeam(t.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[minmax(320px,420px)_1fr] gap-6">
      {/* Grilla: oculta en mobile cuando hay ficha abierta. */}
      <div className={selectedTeamId ? "hidden lg:block" : "block"}>{grid}</div>

      {/* Ficha */}
      <div>
        {selectedTeamId ? (
          <div className="space-y-3">
            <button
              onClick={() => selectTeam(null)}
              className="lg:hidden text-sm text-pitch-100 hover:underline"
            >
              ← Volver a la grilla
            </button>
            <TeamFicha teamId={selectedTeamId} />
          </div>
        ) : (
          <div className="hidden lg:flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-400">
            <div>
              <div className="text-4xl mb-2">⚽</div>
              Elegí una selección para ver su forma reciente y sus números de los
              últimos 4 años.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
