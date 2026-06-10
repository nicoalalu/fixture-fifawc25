// Cálculo en runtime de forma, stats de 4 años y H2H a partir del log de
// partidos del dataset. Mantener puro y testeable (sin React).
import type {
  Dataset,
  HeadToHead,
  Match,
  MatchPerspectiva,
  Resultado,
  Team,
  TeamForm,
  TeamStats4Y,
} from "../types";

export function perspectiva(m: Match, teamId: string): MatchPerspectiva {
  const esLocal = m.local.teamId === teamId;
  const golesFavor = esLocal ? m.local.goles : m.visitante.goles;
  const golesContra = esLocal ? m.visitante.goles : m.local.goles;
  const rivalId = esLocal ? m.visitante.teamId : m.local.teamId;
  let resultado: Resultado;
  if (golesFavor > golesContra) resultado = "G";
  else if (golesFavor < golesContra) resultado = "P";
  else resultado = "E";
  return { match: m, resultado, golesFavor, golesContra, rivalId, esLocal };
}

function desc(a: Match, b: Match): number {
  if (a.fecha > b.fecha) return -1;
  if (a.fecha < b.fecha) return 1;
  // desempate estable por id para orden determinista.
  return a.id < b.id ? 1 : -1;
}

/** Índice por equipo de sus partidos, ordenados desc por fecha. */
export function buildTeamMatchIndex(ds: Dataset): Map<string, Match[]> {
  const idx = new Map<string, Match[]>();
  for (const t of ds.teams) idx.set(t.id, []);
  for (const m of ds.matches) {
    idx.get(m.local.teamId)?.push(m);
    idx.get(m.visitante.teamId)?.push(m);
  }
  for (const arr of idx.values()) arr.sort(desc);
  return idx;
}

export function teamForm(
  teamMatches: Match[],
  teamId: string,
  n = 10,
): TeamForm {
  const ultimos = teamMatches.slice(0, n).map((m) => perspectiva(m, teamId));
  return { teamId, ultimos };
}

function rachaActual(persp: MatchPerspectiva[]): TeamStats4Y["rachaActual"] {
  if (persp.length === 0) return { tipo: "E", texto: "sin datos" };

  // Racha de no-derrota (invicto).
  let sinPerder = 0;
  for (const p of persp) {
    if (p.resultado === "P") break;
    sinPerder++;
  }
  // Racha de un mismo resultado al hilo.
  const primero = persp[0].resultado;
  let iguales = 0;
  for (const p of persp) {
    if (p.resultado === primero) iguales++;
    else break;
  }

  if (primero === "G" && iguales >= 2) {
    return { tipo: "G", texto: `${iguales} victorias al hilo` };
  }
  if (sinPerder >= 3) {
    return { tipo: "invicto", texto: `${sinPerder} partidos sin perder` };
  }
  if (primero === "P" && iguales >= 2) {
    return { tipo: "P", texto: `${iguales} derrotas al hilo` };
  }
  const label = primero === "G" ? "victoria" : primero === "P" ? "derrota" : "empate";
  return { tipo: primero, texto: `viene de ${label}` };
}

export function teamStats4Y(
  teamMatches: Match[],
  teamId: string,
  windowYears: number,
  refDate = new Date(),
): TeamStats4Y {
  const desdeDate = new Date(refDate);
  desdeDate.setFullYear(desdeDate.getFullYear() - windowYears);
  const desde = desdeDate.toISOString().slice(0, 10);
  const hasta = refDate.toISOString().slice(0, 10);

  const enVentana = teamMatches
    .filter((m) => m.fecha >= desde && m.fecha <= hasta)
    .map((m) => perspectiva(m, teamId));

  let pg = 0, pe = 0, pp = 0, gf = 0, gc = 0;
  for (const p of enVentana) {
    if (p.resultado === "G") pg++;
    else if (p.resultado === "E") pe++;
    else pp++;
    gf += p.golesFavor;
    gc += p.golesContra;
  }
  const pj = enVentana.length;

  return {
    teamId,
    desde,
    hasta,
    pj,
    pg,
    pe,
    pp,
    winRate: pj ? pg / pj : 0,
    golesFavor: gf,
    golesContra: gc,
    golesFavorProm: pj ? gf / pj : 0,
    golesContraProm: pj ? gc / pj : 0,
    rachaActual: rachaActual(enVentana),
  };
}

/** H2H entre dos selecciones, perspectiva del equipo A. */
export function headToHead(
  teamMatchesA: Match[],
  teamAId: string,
  teamBId: string,
): HeadToHead {
  const cruces = teamMatchesA
    .filter(
      (m) =>
        m.local.teamId === teamBId || m.visitante.teamId === teamBId,
    )
    .map((m) => perspectiva(m, teamAId));

  let ganadosA = 0, empates = 0, ganadosB = 0, golesA = 0, golesB = 0;
  for (const p of cruces) {
    if (p.resultado === "G") ganadosA++;
    else if (p.resultado === "E") empates++;
    else ganadosB++;
    golesA += p.golesFavor;
    golesB += p.golesContra;
  }

  return {
    teamAId,
    teamBId,
    enfrentamientos: cruces,
    resumen: {
      totalPJ: cruces.length,
      ganadosA,
      empates,
      ganadosB,
      golesA,
      golesB,
      ultimoCruce: cruces[0]?.match ?? null,
    },
  };
}

export function teamMap(ds: Dataset): Map<string, Team> {
  return new Map(ds.teams.map((t) => [t.id, t]));
}
