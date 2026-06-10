import { useMemo, useState } from "react";
import { dataset } from "../lib/dataset";
import { getAllTeams, getH2H, getTeam, useApp } from "../store";
import type { Fixture2026 } from "../types";
import { Flag } from "./ui";

function fmtFechaCorta(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function FixtureRow({ f }: { f: Fixture2026 }) {
  const abrirCruce = useApp((s) => s.abrirCruce);
  const a = getTeam(f.teamAId);
  const b = getTeam(f.teamBId);
  if (!a || !b) return null;
  const pj = getH2H(a.id, b.id).resumen.totalPJ;

  return (
    <button
      onClick={() => abrirCruce(a.id, b.id)}
      className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-left transition hover:border-pitch-500 hover:bg-ink-700/60"
    >
      <span className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
        <span className="truncate text-sm">{a.nombre}</span>
        <Flag team={a} className="text-xl" />
      </span>
      <span className="px-1 text-xs text-slate-500">vs</span>
      <span className="flex flex-1 items-center gap-1.5 min-w-0">
        <Flag team={b} className="text-xl" />
        <span className="truncate text-sm">{b.nombre}</span>
      </span>
      <span className="hidden sm:flex flex-col items-end text-[11px] text-slate-400 whitespace-nowrap">
        <span>{fmtFechaCorta(f.fecha)}</span>
        <span className="truncate max-w-[120px]">{f.sede}</span>
      </span>
      <span
        className="chip bg-white/5 ring-1 ring-white/10 text-[11px] whitespace-nowrap"
        title="Enfrentamientos históricos"
      >
        {pj > 0 ? `${pj} H2H` : "inédito"}
      </span>
    </button>
  );
}

function FreeSelector() {
  const teams = getAllTeams();
  const abrirCruce = useApp((s) => s.abrirCruce);
  const [aId, setAId] = useState(teams[0]?.id ?? "");
  const [bId, setBId] = useState(teams[1]?.id ?? "");

  const opciones = useMemo(
    () => [...teams].sort((x, y) => x.nombre.localeCompare(y.nombre, "es")),
    [teams],
  );

  const sel =
    "rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm focus:border-pitch-500";

  return (
    <div className="card p-4">
      <div className="text-sm font-semibold">Simular cualquier cruce</div>
      <p className="mt-0.5 text-xs text-slate-400">
        Anticipá posibles cruces de eliminatorias eligiendo dos selecciones.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={aId}
          onChange={(e) => setAId(e.target.value)}
          aria-label="Equipo A"
          className={sel}
        >
          {opciones.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">vs</span>
        <select
          value={bId}
          onChange={(e) => setBId(e.target.value)}
          aria-label="Equipo B"
          className={sel}
        >
          {opciones.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={() => aId !== bId && abrirCruce(aId, bId)}
          disabled={aId === bId}
          className="rounded-xl bg-pitch-500 px-4 py-2 text-sm font-semibold text-pitch-900 enabled:hover:bg-pitch-100 disabled:opacity-40"
        >
          Ver cara a cara
        </button>
      </div>
      {aId === bId && (
        <p className="mt-2 text-xs text-amber-300">Elegí dos selecciones distintas.</p>
      )}
    </div>
  );
}

export function MundialTab() {
  const fixturesByGroup = useMemo(() => {
    const map = new Map<string, Fixture2026[]>();
    for (const f of dataset.fixtures) {
      if (!map.has(f.grupo)) map.set(f.grupo, []);
      map.get(f.grupo)!.push(f);
    }
    for (const arr of map.values()) {
      arr.sort((x, y) =>
        x.fecha === y.fecha ? x.numeroPartido - y.numeroPartido : x.fecha < y.fecha ? -1 : 1,
      );
    }
    return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, []);

  return (
    <div className="space-y-5">
      <FreeSelector />

      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Fixture · fase de grupos
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          Tocá un cruce para ver el cara a cara histórico y el insight. Fechas y
          sedes indicativas.
        </p>

        <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
          {fixturesByGroup.map(([g, fixtures]) => (
            <section key={g}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Grupo {g}
              </div>
              <div className="space-y-2">
                {fixtures.map((f) => (
                  <FixtureRow key={f.id} f={f} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
