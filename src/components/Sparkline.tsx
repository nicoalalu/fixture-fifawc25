import type { MatchPerspectiva } from "../types";

/** Mini-sparkline de la forma: una barra por partido (alto = puntos
 *  obtenidos: G=3, E=1, P=0). Decisión §11.1 (punto 2): sparkline de forma. */
export function Sparkline({
  partidos,
  className = "",
}: {
  partidos: MatchPerspectiva[];
  className?: string;
}) {
  // Más antiguo → más reciente (de izq a der).
  const data = [...partidos].reverse();
  if (data.length === 0) {
    return <div className={"text-xs text-slate-500 " + className}>Sin datos</div>;
  }
  return (
    <div
      className={"flex items-end gap-0.5 h-8 " + className}
      role="img"
      aria-label="Tendencia de la forma reciente"
    >
      {data.map((p) => {
        const pts = p.resultado === "G" ? 3 : p.resultado === "E" ? 1 : 0;
        const h = 20 + (pts / 3) * 80; // 20%..100%
        const color =
          p.resultado === "G"
            ? "bg-emerald-500"
            : p.resultado === "E"
              ? "bg-amber-400"
              : "bg-rose-500";
        return (
          <div
            key={p.match.id}
            className={"w-1.5 rounded-sm " + color}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}
