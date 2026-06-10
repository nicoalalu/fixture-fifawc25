/**
 * Build del dataset (Opción A de la spec, §4): genera un snapshot estático
 * `src/data/dataset.json` que la app consume sin backend ni API key en runtime.
 *
 * Dos modos:
 *  1. API-Football  -> si existe la env var API_FOOTBALL_KEY, pega a la API y
 *     arma el dataset con datos reales. (función buildFromApiFootball)
 *  2. Simulado      -> si no hay key, genera datos deterministas (seed fija)
 *     plausibles a partir del ranking de cada selección. Sirve para desarrollar
 *     y para demo. Queda marcado en meta.fuente = "simulado".
 *
 * Uso:
 *   npm run build:dataset                 # simulado
 *   API_FOOTBALL_KEY=xxxx npm run build:dataset   # datos reales (cuando exista)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TEAMS } from "../src/data/teams.ts";
import type {
  Dataset,
  Match,
  Fixture2026,
  Team,
  GrupoId,
  Confederacion,
} from "../src/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/dataset.json");

const STATS_WINDOW_YEARS = 4;
const SEED = 20260611; // fecha de inicio del Mundial, como seed reproducible.

// ----------------------------- utilidades -----------------------------------

/** PRNG determinista (mulberry32). */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Muestreo Poisson (algoritmo de Knuth). */
function poisson(rng: () => number, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function pickWeighted<T>(rng: () => number, options: [T, number][]): T {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [val, w] of options) {
    r -= w;
    if (r <= 0) return val;
  }
  return options[options.length - 1][0];
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ----------------------- nombres de competiciones ---------------------------

const CONTINENTAL: Record<Confederacion, string> = {
  CONMEBOL: "Copa América",
  UEFA: "UEFA Nations League",
  CONCACAF: "Copa Oro",
  CAF: "Copa Africana de Naciones",
  AFC: "Copa Asiática",
  OFC: "Copa de Naciones OFC",
};

function competicionFor(
  rng: () => number,
  a: Team,
  b: Team,
): string {
  if (a.confederacion === b.confederacion) {
    return pickWeighted(rng, [
      ["Amistoso", 0.4],
      [`Eliminatorias ${a.confederacion}`, 0.32],
      [CONTINENTAL[a.confederacion], 0.28],
    ]);
  }
  return pickWeighted(rng, [
    ["Amistoso", 0.82],
    ["Amistoso internacional", 0.18],
  ]);
}

// ------------------------- generación simulada -------------------------------

/** fuerza relativa en (0,1] a partir del ranking (rank 1 ≈ 1.0). */
function strength(rank: number): number {
  const MAX = 92;
  return (MAX - rank) / MAX;
}

function buildSimulated(): Dataset {
  const rng = makeRng(SEED);
  const teams: Team[] = TEAMS.map((t) => ({ ...t }));
  const byId = new Map(teams.map((t) => [t.id, t]));

  const matches: Match[] = [];
  let matchSeq = 0;

  const porConfederacion = new Map<Confederacion, Team[]>();
  for (const t of teams) {
    if (!porConfederacion.has(t.confederacion)) porConfederacion.set(t.confederacion, []);
    porConfederacion.get(t.confederacion)!.push(t);
  }

  function jugarPartido(home: Team, away: Team, windowDate: Date) {
    const sH = strength(home.rankingFIFA);
    const sA = strength(away.rankingFIFA);
    const base = 1.3;
    const lambdaH = Math.min(4.5, Math.max(0.15, base * Math.exp(1.05 * (sH - sA)) * 1.12));
    const lambdaA = Math.min(4.5, Math.max(0.15, base * Math.exp(1.05 * (sA - sH))));
    const day = new Date(windowDate);
    day.setUTCDate(day.getUTCDate() + Math.floor(rng() * 5) - 2);
    matches.push({
      id: `m${++matchSeq}`,
      fecha: iso(day),
      competicion: competicionFor(rng, home, away),
      local: { teamId: home.id, goles: poisson(rng, lambdaH) },
      visitante: { teamId: away.id, goles: poisson(rng, lambdaA) },
    });
  }

  function emparejarYJugar(order: Team[], windowDate: Date, restProb: number) {
    for (let i = 0; i + 1 < order.length; i += 2) {
      if (rng() < restProb) continue; // a veces una dupla descansa
      jugarPartido(order[i], order[i + 1], windowDate);
    }
  }

  // Intercala selecciones de distintas confederaciones (round-robin entre
  // baldes) para que los pares consecutivos sean casi siempre cruzados.
  function intercalarPorConfederacion(): Team[] {
    const baldes = [...porConfederacion.values()].map((arr) => shuffle(rng, arr));
    const out: Team[] = [];
    let quedan = true;
    while (quedan) {
      quedan = false;
      for (const b of baldes) {
        const t = b.pop();
        if (t) {
          out.push(t);
          if (b.length) quedan = true;
        }
      }
    }
    return out;
  }

  // Ventanas FIFA hacia atrás desde may-2026, alternando:
  //  - intra-confederación (eliminatorias / copas continentales): rivalrías
  //    densas → habilitan dominancia y tendencias en el H2H.
  //  - amistosos/intercontinentales: pares cruzados, base del fixture mundialista.
  const end = new Date(Date.UTC(2026, 4, 20)); // 2026-05-20
  for (let i = 0; i < 60; i++) {
    const windowDate = new Date(end);
    windowDate.setUTCDate(windowDate.getUTCDate() - i * 31 - Math.floor(rng() * 8));

    if (i % 2 === 0) {
      // Amistosos con sesgo inter-confederación.
      emparejarYJugar(intercalarPorConfederacion(), windowDate, 0.15);
    } else {
      // Eliminatorias / copas continentales, dentro de cada confederación.
      for (const grupoConf of porConfederacion.values()) {
        if (grupoConf.length >= 2) emparejarYJugar(shuffle(rng, grupoConf), windowDate, 0.1);
      }
    }
  }

  matches.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));

  const fixtures = buildFixtures(teams, byId);

  return {
    meta: {
      version: "0.1.0",
      generadoEl: new Date().toISOString(),
      fuente: "simulado",
      ventanaAniosStats: STATS_WINDOW_YEARS,
      notas:
        "Datos históricos SIMULADOS de forma determinista a partir del ranking FIFA. " +
        "No representan resultados reales. Reemplazar corriendo el build con API_FOOTBALL_KEY.",
    },
    teams,
    matches,
    fixtures,
  };
}

// --------------------------- fixture WC 2026 ---------------------------------

const HOST_CITIES = [
  "Vancouver",
  "Seattle",
  "San Francisco Bay Area",
  "Los Ángeles",
  "Kansas City",
  "Dallas",
  "Atlanta",
  "Houston",
  "Boston",
  "Filadelfia",
  "Miami",
  "Nueva York / Nueva Jersey",
  "Toronto",
  "Monterrey",
  "Guadalajara",
  "Ciudad de México",
];

/** Round-robin de cada grupo (4 equipos → 6 partidos → 72 en total). */
function buildFixtures(teams: Team[], _byId: Map<string, Team>): Fixture2026[] {
  const grupos = new Map<GrupoId, Team[]>();
  for (const t of teams) {
    if (!grupos.has(t.grupo)) grupos.set(t.grupo, []);
    grupos.get(t.grupo)!.push(t);
  }

  // 3 jornadas: pares de índices [local, visitante].
  const jornadas: [number, number][][] = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [3, 1],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ];

  // Fechas indicativas de la fase de grupos (11–27 jun 2026).
  const jornadaFechaBase = [
    Date.UTC(2026, 5, 11),
    Date.UTC(2026, 5, 18),
    Date.UTC(2026, 5, 24),
  ];

  const fixtures: Fixture2026[] = [];
  let n = 0;
  let cityIdx = 0;
  const gruposOrden = [...grupos.keys()].sort();

  for (let j = 0; j < jornadas.length; j++) {
    gruposOrden.forEach((g, gi) => {
      const eq = grupos.get(g)!;
      for (const [li, vi] of jornadas[j]) {
        const fecha = new Date(jornadaFechaBase[j]);
        fecha.setUTCDate(fecha.getUTCDate() + (gi % 6));
        n++;
        fixtures.push({
          id: `wc-${g}-j${j + 1}-${li}${vi}`,
          grupo: g,
          fecha: iso(fecha),
          sede: HOST_CITIES[cityIdx++ % HOST_CITIES.length],
          teamAId: eq[li].id,
          teamBId: eq[vi].id,
          fase: "grupos",
          numeroPartido: n,
        });
      }
    });
  }

  return fixtures;
}

// --------------------------- API-Football ------------------------------------

/**
 * Camino de datos reales. Implementación de referencia: pega a API-Football
 * (api-sports.io) para traer los últimos partidos de cada selección y arma el
 * mismo `Dataset`. Requiere un mapping de id FIFA -> id de equipo de la API
 * (no incluido acá porque depende de la cuenta). Se deja como punto de
 * integración documentado; lanza si se invoca sin completarlo.
 */
async function buildFromApiFootball(_apiKey: string): Promise<Dataset> {
  // Endpoints relevantes (ver §3 de la spec):
  //   GET https://v3.football.api-sports.io/fixtures?team={id}&last=20
  //   GET https://v3.football.api-sports.io/fixtures/headtohead?h2h={idA}-{idB}
  // headers: { "x-apisports-key": apiKey }
  throw new Error(
    "buildFromApiFootball: falta el mapping FIFA->API y la cuota de la cuenta. " +
      "Completá el mapping de equipos y la paginación antes de usar este modo.",
  );
}

// --------------------------------- main --------------------------------------

async function main() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  let dataset: Dataset;

  if (apiKey) {
    console.log("[build-dataset] Usando API-Football (datos reales).");
    dataset = await buildFromApiFootball(apiKey);
  } else {
    console.log(
      "[build-dataset] Sin API_FOOTBALL_KEY: generando snapshot SIMULADO determinista.",
    );
    dataset = buildSimulated();
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(dataset, null, 0) + "\n", "utf8");

  console.log(
    `[build-dataset] OK -> ${OUT}\n` +
      `  equipos: ${dataset.teams.length}\n` +
      `  partidos históricos: ${dataset.matches.length}\n` +
      `  fixtures WC2026: ${dataset.fixtures.length}\n` +
      `  fuente: ${dataset.meta.fuente}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
