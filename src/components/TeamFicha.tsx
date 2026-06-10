import { getForm, getStats, getTeam } from "../store";
import { Flag } from "./ui";
import { FormStrip } from "./FormStrip";
import { StatCard } from "./StatCard";
import { Sparkline } from "./Sparkline";

const CONF_LABEL: Record<string, string> = {
  CONMEBOL: "Sudamérica",
  UEFA: "Europa",
  CONCACAF: "Norte/Centroamérica",
  CAF: "África",
  AFC: "Asia",
  OFC: "Oceanía",
};

export function TeamFicha({ teamId }: { teamId: string }) {
  const team = getTeam(teamId);
  if (!team) return null;
  const form = getForm(teamId);
  const stats = getStats(teamId);

  const pct = Math.round(stats.winRate * 100);
  const dif = stats.golesFavor - stats.golesContra;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Flag team={team} className="text-5xl" />
          <div className="min-w-0">
            <h2 className="text-2xl font-bold truncate">{team.nombre}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="chip bg-pitch-500/15 text-pitch-100 ring-1 ring-pitch-500/30">
                Grupo {team.grupo}
              </span>
              <span className="chip bg-white/5 ring-1 ring-white/10">
                {CONF_LABEL[team.confederacion] ?? team.confederacion}
              </span>
              <span className="chip bg-white/5 ring-1 ring-white/10 font-mono">
                {team.codigoFIFA}
              </span>
              <span className="chip bg-white/5 ring-1 ring-white/10">
                Ranking FIFA #{team.rankingFIFA}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forma reciente */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Forma · últimos {form.ultimos.length}
        </h3>
        <div className="card p-4">
          <FormStrip form={form} />
        </div>
      </section>

      {/* Stats últimos 4 años */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Últimos 4 años{" "}
          <span className="font-normal normal-case text-slate-500">
            ({stats.desde} → {stats.hasta} · {stats.pj} PJ)
          </span>
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="% de victorias"
            value={`${pct}%`}
            sub={`Récord ${stats.pg}-${stats.pe}-${stats.pp} (G-E-P)`}
            accent="text-emerald-300"
          />
          <StatCard
            label="Goles por partido"
            value={`${stats.golesFavorProm.toFixed(1)} / ${stats.golesContraProm.toFixed(1)}`}
            sub={`A favor / en contra · dif ${dif >= 0 ? "+" : ""}${dif}`}
          />
          <StatCard
            label="Racha actual"
            value={
              <span className="text-base font-semibold leading-tight">
                {stats.rachaActual.texto}
              </span>
            }
            accent={
              stats.rachaActual.tipo === "G" || stats.rachaActual.tipo === "invicto"
                ? "text-emerald-300"
                : stats.rachaActual.tipo === "P"
                  ? "text-rose-300"
                  : "text-slate-100"
            }
          />
          <StatCard label="Tendencia (últimos 10)" value={<span className="sr-only">sparkline</span>}>
            <Sparkline partidos={form.ultimos} className="mt-1" />
            <div className="text-xs text-slate-400 mt-1">G=3 · E=1 · P=0 pts</div>
          </StatCard>
        </div>
      </section>
    </div>
  );
}
