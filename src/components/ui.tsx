import type { Resultado, Team } from "../types";

export function Flag({ team, className = "" }: { team: Team; className?: string }) {
  // El dataset simulado usa emojis; el real (API-Football) puede traer la url
  // del escudo. Soportamos ambos.
  if (/^https?:\/\//.test(team.bandera)) {
    return (
      <img
        src={team.bandera}
        alt={`Escudo de ${team.nombre}`}
        loading="lazy"
        className={"inline-block h-[1em] w-[1em] object-contain align-[-0.125em] " + className}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={`Bandera de ${team.nombre}`}
      className={"leading-none " + className}
    >
      {team.bandera}
    </span>
  );
}

export function TeamLabel({
  team,
  size = "md",
  showCode = false,
}: {
  team: Team;
  size?: "sm" | "md" | "lg";
  showCode?: boolean;
}) {
  const flagSize =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const textSize =
    size === "lg" ? "text-lg font-semibold" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Flag team={team} className={flagSize} />
      <span className={"truncate " + textSize}>{team.nombre}</span>
      {showCode && (
        <span className="text-xs text-slate-400 font-mono">{team.codigoFIFA}</span>
      )}
    </span>
  );
}

const RESULT_META: Record<
  Resultado,
  { label: string; icon: string; dot: string; pill: string }
> = {
  G: {
    label: "Ganó",
    icon: "✓",
    dot: "bg-emerald-500 text-emerald-950",
    pill: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  },
  E: {
    label: "Empató",
    icon: "=",
    dot: "bg-amber-400 text-amber-950",
    pill: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30",
  },
  P: {
    label: "Perdió",
    icon: "✕",
    dot: "bg-rose-500 text-rose-950",
    pill: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  },
};

/** Punto del semáforo: color + ícono (no solo color, por accesibilidad). */
export function ResultDot({ r, title }: { r: Resultado; title?: string }) {
  const m = RESULT_META[r];
  return (
    <span
      className={
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold " +
        m.dot
      }
      role="img"
      aria-label={m.label}
      title={title ?? m.label}
    >
      {m.icon}
    </span>
  );
}

export function ResultPill({ r }: { r: Resultado }) {
  const m = RESULT_META[r];
  return (
    <span className={"chip " + m.pill}>
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  );
}

export function resultMeta(r: Resultado) {
  return RESULT_META[r];
}
