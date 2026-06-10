/**
 * Validación del dataset (spec §7.5 y §10). Falla con código !=0 si algo no
 * cumple, para poder encadenarlo en CI / antes del build.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dataset } from "../src/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "../src/data/dataset.json");

export function validateDataset(ds: Dataset): string[] {
  const errors: string[] = [];

  // 48 selecciones.
  if (ds.teams.length !== 48) {
    errors.push(`Se esperaban 48 selecciones, hay ${ds.teams.length}.`);
  }

  // 4 por grupo, 12 grupos.
  const porGrupo = new Map<string, number>();
  for (const t of ds.teams) {
    porGrupo.set(t.grupo, (porGrupo.get(t.grupo) ?? 0) + 1);
  }
  const grupos = "ABCDEFGHIJKL".split("");
  for (const g of grupos) {
    const c = porGrupo.get(g) ?? 0;
    if (c !== 4) errors.push(`El grupo ${g} tiene ${c} selecciones (esperado 4).`);
  }

  // IDs únicos.
  const ids = new Set<string>();
  for (const t of ds.teams) {
    if (ids.has(t.id)) errors.push(`Id de equipo duplicado: ${t.id}.`);
    ids.add(t.id);
  }

  // 72 partidos de fase de grupos.
  if (ds.fixtures.length !== 72) {
    errors.push(`Se esperaban 72 partidos de grupos, hay ${ds.fixtures.length}.`);
  }

  // Referencias válidas y sin auto-cruces en el fixture.
  for (const f of ds.fixtures) {
    if (!ids.has(f.teamAId)) errors.push(`Fixture ${f.id}: teamAId desconocido (${f.teamAId}).`);
    if (!ids.has(f.teamBId)) errors.push(`Fixture ${f.id}: teamBId desconocido (${f.teamBId}).`);
    if (f.teamAId === f.teamBId) errors.push(`Fixture ${f.id}: un equipo contra sí mismo.`);
  }

  // Partidos históricos: referencias, goles no negativos, fechas válidas.
  const matchIds = new Set<string>();
  for (const m of ds.matches) {
    if (matchIds.has(m.id)) errors.push(`Partido duplicado: ${m.id}.`);
    matchIds.add(m.id);
    if (!ids.has(m.local.teamId)) errors.push(`Partido ${m.id}: local desconocido.`);
    if (!ids.has(m.visitante.teamId)) errors.push(`Partido ${m.id}: visitante desconocido.`);
    if (m.local.teamId === m.visitante.teamId) errors.push(`Partido ${m.id}: equipo contra sí mismo.`);
    if (m.local.goles < 0 || m.visitante.goles < 0) errors.push(`Partido ${m.id}: goles negativos.`);
    if (Number.isNaN(Date.parse(m.fecha))) errors.push(`Partido ${m.id}: fecha inválida (${m.fecha}).`);
  }

  return errors;
}

// Permite usarse como módulo (tests) o como CLI.
const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const ds = JSON.parse(readFileSync(FILE, "utf8")) as Dataset;
  const errors = validateDataset(ds);
  if (errors.length) {
    console.error(`[validate-dataset] ${errors.length} error(es):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("[validate-dataset] OK: dataset válido (48 equipos, 12 grupos x4, 72 fixtures).");
}
