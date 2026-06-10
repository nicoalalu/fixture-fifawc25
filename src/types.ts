// Modelo de datos del Prode Stats WC2026 (ver §5 de la spec).
// Estos tipos son la fuente de verdad compartida entre el build de datos
// (scripts/build-dataset.ts) y la app.

export type Confederacion =
  | "CONMEBOL"
  | "UEFA"
  | "CONCACAF"
  | "CAF"
  | "AFC"
  | "OFC";

export type GrupoId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export interface Team {
  id: string; // código FIFA en minúscula, ej. "arg"
  nombre: string;
  codigoFIFA: string; // ej. "ARG"
  confederacion: Confederacion;
  // grupo del Mundial 2026 para los 48 clasificados; null para rivales
  // históricos que no están clasificados (aparecen sólo en forma/H2H).
  grupo: GrupoId | null;
  bandera: string; // emoji (o url de escudo si viene de la API)
  rankingFIFA: number; // posición aproximada en el ranking FIFA (0 = desconocido)
  // true para los 48 clasificados; false para rivales históricos extra.
  qualified: boolean;
}

export type Resultado = "G" | "E" | "P";

/** Un partido histórico entre dos selecciones (log global). */
export interface Match {
  id: string;
  fecha: string; // ISO yyyy-mm-dd
  competicion: string; // "Amistoso" | "Eliminatorias" | "Copa América" | ...
  local: { teamId: string; goles: number };
  visitante: { teamId: string; goles: number };
}

/** Partido del fixture del Mundial 2026 (fase de grupos). */
export interface Fixture2026 {
  id: string;
  grupo: GrupoId;
  fecha: string; // ISO yyyy-mm-dd
  sede: string;
  teamAId: string;
  teamBId: string;
  fase: "grupos";
  numeroPartido: number;
}

export interface DatasetMeta {
  version: string;
  generadoEl: string; // ISO
  fuente: "api-football" | "simulado";
  ventanaAniosStats: number;
  notas?: string;
}

export interface Dataset {
  meta: DatasetMeta;
  teams: Team[];
  matches: Match[];
  fixtures: Fixture2026[];
}

// ---- Tipos derivados (se calculan en runtime a partir del Dataset) ----

export interface MatchPerspectiva {
  match: Match;
  resultado: Resultado;
  golesFavor: number;
  golesContra: number;
  rivalId: string;
  esLocal: boolean;
}

export interface TeamForm {
  teamId: string;
  ultimos: MatchPerspectiva[]; // ordenados desc por fecha (máx 10)
}

export interface TeamStats4Y {
  teamId: string;
  desde: string;
  hasta: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  winRate: number; // 0..1
  golesFavorProm: number;
  golesContraProm: number;
  golesFavor: number;
  golesContra: number;
  rachaActual: { tipo: "G" | "E" | "P" | "invicto" | "sinDerrotas"; texto: string };
}

export interface HeadToHead {
  teamAId: string;
  teamBId: string;
  enfrentamientos: MatchPerspectiva[]; // perspectiva del equipo A, desc por fecha
  resumen: {
    totalPJ: number;
    ganadosA: number;
    empates: number;
    ganadosB: number;
    golesA: number;
    golesB: number;
    ultimoCruce: Match | null;
  };
}

export type TonoInsight = "favorable" | "parejo" | "sin-historia" | "goleador";

export interface Insight {
  texto: string;
  tono: TonoInsight;
  regla: string;
}
