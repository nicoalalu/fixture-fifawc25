/**
 * Build del dataset (Opción A de la spec, §4): genera un snapshot estático
 * `src/data/dataset.json` que la app consume sin backend ni API key en runtime.
 *
 * Tres fuentes (elegibles con DATA_SOURCE; por defecto la primera que aplique):
 *  1. open-data    -> DEFAULT. Datos REALES del CSV abierto
 *     martj42/international_results (gratis, sin key). Incluye el fixture real
 *     del Mundial 2026. (buildFromOpenData)
 *  2. api-football -> si está API_FOOTBALL_KEY. Datos reales vía API-Football.
 *  3. simulated    -> datos deterministas a partir del ranking, sin red.
 *
 * Uso:
 *   npm run build:dataset                          # open data (real)
 *   API_FOOTBALL_KEY=xxxx npm run build:dataset    # API-Football
 *   DATA_SOURCE=simulated npm run build:dataset    # simulado
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
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
  const teams: Team[] = TEAMS.map((t) => ({ ...t, qualified: true }));
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
    if (!t.grupo) continue;
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
//
// Camino de datos REALES (api-sports.io v3). Resuelve el id de equipo de cada
// selección por búsqueda de nombre (no hace falta hardcodear ids), trae sus
// últimos partidos terminados y arma el mismo `Dataset`. Cachea cada respuesta
// en disco (scripts/.cache) y throttlea, para sobrevivir al rate limit del free
// tier (~100 req/día) y poder reanudar entre corridas.

const API_BASE = "https://v3.football.api-sports.io";
const CACHE_DIR = process.env.API_FOOTBALL_CACHE_DIR
  ? resolve(process.env.API_FOOTBALL_CACHE_DIR)
  : resolve(__dirname, ".cache");
// Free tier de api-sports.io: ~10 requests/minuto → ~6.5 s de espaciado.
// Subilo si tenés plan pago (más rps) o bajalo si querés ir más rápido.
const REQUEST_DELAY_MS = Number(process.env.API_FOOTBALL_DELAY_MS ?? 6500);
const MAX_RETRIES = Number(process.env.API_FOOTBALL_RETRIES ?? 5);

// El plan Free NO admite el parámetro `last` y sólo cubre ciertas temporadas
// (históricamente 2021–2023). Por eso pedimos por temporada. Configurable:
//   API_FOOTBALL_SEASONS=2023,2022,2021
// OJO: cada temporada = 48 requests. El free tier son ~100 requests/día, así
// que con 1 temporada entra en una corrida; con más, se completa en días
// sucesivos gracias al caché en disco (o con un plan pago).
const API_FOOTBALL_SEASONS = (process.env.API_FOOTBALL_SEASONS ?? "2023,2022,2021")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Nombre en inglés con el que se busca cada selección en la API. La búsqueda
// (`/teams?search=`) tolera variantes; ante ambigüedad se filtra national=true.
const API_SEARCH_NAME: Record<string, string> = {
  mex: "Mexico", rsa: "South Africa", kor: "South Korea", cze: "Czech Republic",
  can: "Canada", sui: "Switzerland", qat: "Qatar", bih: "Bosnia",
  bra: "Brazil", mar: "Morocco", sco: "Scotland", hai: "Haiti",
  usa: "USA", aus: "Australia", par: "Paraguay", tur: "Turkey",
  ger: "Germany", ecu: "Ecuador", civ: "Ivory Coast", cuw: "Curacao",
  ned: "Netherlands", jpn: "Japan", tun: "Tunisia", swe: "Sweden",
  bel: "Belgium", irn: "Iran", egy: "Egypt", nzl: "New Zealand",
  esp: "Spain", uru: "Uruguay", ksa: "Saudi Arabia", cpv: "Cape Verde",
  fra: "France", sen: "Senegal", nor: "Norway", irq: "Iraq",
  arg: "Argentina", aut: "Austria", alg: "Algeria", jor: "Jordan",
  por: "Portugal", col: "Colombia", uzb: "Uzbekistan", cod: "Congo DR",
  eng: "England", cro: "Croatia", pan: "Panama", gha: "Ghana",
};

// Override opcional id de API por si la búsqueda falla o es ambigua para
// alguna selección. Completar acá si hiciera falta (ej. { kor: 17 }).
const API_TEAM_ID_OVERRIDE: Record<string, number> = {};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let liveRequests = 0;

/** GET a la API con caché en disco. Sólo throttlea/cuenta los hits reales. */
export async function apiGet(
  apiKey: string,
  endpoint: string,
  params: Record<string, string | number>,
  cacheKey: string,
): Promise<any> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = resolve(CACHE_DIR, cacheKey + ".json");
  if (existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, "utf8"));
  }

  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)] as [string, string]),
  ).toString();
  const url = `${API_BASE}${endpoint}?${qs}`;

  for (let attempt = 0; ; attempt++) {
    if (liveRequests > 0) await sleep(REQUEST_DELAY_MS);
    liveRequests++;

    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });

    // 429 (rate limit) o 5xx: reintentar con backoff, respetando Retry-After.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : REQUEST_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[build-dataset] HTTP ${res.status} en ${endpoint}; reintento ` +
          `${attempt + 1}/${MAX_RETRIES} en ${Math.round(waitMs / 1000)}s…`,
      );
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) {
      throw new Error(`API-Football ${endpoint} -> HTTP ${res.status} ${res.statusText}`);
    }

    const json: any = await res.json();
    if (Array.isArray(json.errors) ? json.errors.length : Object.keys(json.errors ?? {}).length) {
      // El rate limit a veces llega como 200 con errors en el body.
      const errStr = JSON.stringify(json.errors);
      const isDaily = /day|daily|reached the request limit/i.test(errStr);
      if (isDaily) {
        // Cuota diaria agotada: no tiene sentido reintentar. Lo ya bajado quedó
        // cacheado; reanudá mañana o reducí API_FOOTBALL_SEASONS.
        throw new Error(
          `API-Football: cuota diaria agotada (${errStr}). Lo descargado quedó ` +
            `en caché (scripts/.cache); reanudá la corrida cuando se resetee la ` +
            `cuota, o reducí temporadas con API_FOOTBALL_SEASONS.`,
        );
      }
      if (/rate|limit|too many|minute/i.test(errStr) && attempt < MAX_RETRIES) {
        const waitMs = REQUEST_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[build-dataset] rate limit (body) en ${endpoint}; reintento ` +
            `${attempt + 1}/${MAX_RETRIES} en ${Math.round(waitMs / 1000)}s…`,
        );
        await sleep(waitMs);
        continue;
      }
      throw new Error(`API-Football ${endpoint} errores: ${errStr}`);
    }
    writeFileSync(cacheFile, JSON.stringify(json), "utf8");
    return json;
  }
}

async function resolveTeamId(apiKey: string, teamId: string): Promise<number> {
  if (API_TEAM_ID_OVERRIDE[teamId]) return API_TEAM_ID_OVERRIDE[teamId];
  const search = API_SEARCH_NAME[teamId] ?? teamId;
  const json = await apiGet(apiKey, "/teams", { search }, `team-search-${teamId}`);
  const candidatos: any[] = json.response ?? [];
  const national = candidatos.find((c) => c.team?.national) ?? candidatos[0];
  if (!national?.team?.id) {
    throw new Error(
      `No se pudo resolver el id de API para "${search}" (${teamId}). ` +
        `Agregá un override en API_TEAM_ID_OVERRIDE.`,
    );
  }
  return national.team.id;
}

// Traducción liviana de competiciones frecuentes al español.
function traducirLiga(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("friendl")) return "Amistoso";
  if (n.includes("nations league")) return "UEFA Nations League";
  if (n.includes("euro")) return "Eurocopa";
  if (n.includes("copa america") || n.includes("copa américa")) return "Copa América";
  if (n.includes("gold cup")) return "Copa Oro";
  if (n.includes("africa")) return "Copa Africana de Naciones";
  if (n.includes("asian cup")) return "Copa Asiática";
  if (n.includes("world cup") && n.includes("quali")) return "Eliminatorias Mundial";
  if (n.includes("world cup")) return "Copa del Mundo";
  if (n.includes("quali")) return "Eliminatorias";
  return name;
}

const FINISHED = new Set(["FT", "AET", "PEN"]);

export async function buildFromApiFootball(apiKey: string): Promise<Dataset> {
  // Verifica la cuenta / cuota antes de empezar.
  const status = await apiGet(apiKey, "/status", {}, "status");
  const reqInfo = status.response?.requests;
  if (reqInfo) {
    console.log(
      `[build-dataset] API-Football cuenta "${status.response?.account?.email ?? "?"}" ` +
        `· requests ${reqInfo.current}/${reqInfo.limit_day} hoy.`,
    );
  }

  const seeds = TEAMS;

  // 1) Resolver id de API por selección.
  const apiIdByTeam = new Map<string, number>();
  const teamByApiId = new Map<number, string>();
  for (const t of seeds) {
    const apiId = await resolveTeamId(apiKey, t.id);
    apiIdByTeam.set(t.id, apiId);
    teamByApiId.set(apiId, t.id);
    console.log(`[build-dataset]   ${t.codigoFIFA} -> API id ${apiId}`);
  }

  // 2) Equipos: las 48 clasificadas + rivales históricos (se agregan al vuelo).
  const teams: Team[] = seeds.map((t) => ({ ...t, qualified: true }));
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  function ensureOpponent(apiTeam: { id: number; name: string; logo?: string }): string {
    const known = teamByApiId.get(apiTeam.id);
    if (known) return known;
    const synthId = `api-${apiTeam.id}`;
    if (!teamsById.has(synthId)) {
      const opp: Team = {
        id: synthId,
        nombre: apiTeam.name,
        codigoFIFA: apiTeam.name.slice(0, 3).toUpperCase(),
        confederacion: "UEFA", // desconocida; no se usa para rivales no clasificados
        grupo: null,
        bandera: apiTeam.logo ?? "🏳️",
        rankingFIFA: 0,
        qualified: false,
      };
      teams.push(opp);
      teamsById.set(synthId, opp);
      teamByApiId.set(apiTeam.id, synthId);
    }
    return synthId;
  }

  // 3) Traer partidos de cada selección por temporada y volcarlos al log global.
  const matchesById = new Map<string, Match>();
  for (const t of seeds) {
    const apiId = apiIdByTeam.get(t.id)!;
    for (const season of API_FOOTBALL_SEASONS) {
      let json: any;
      try {
        json = await apiGet(
          apiKey,
          "/fixtures",
          { team: apiId, season },
          `fixtures-${t.id}-${season}`,
        );
      } catch (err) {
        // Una temporada no disponible en el plan no debe abortar todo el build.
        if (/plan|season|subscription/i.test(String(err))) {
          console.warn(
            `[build-dataset] ${t.codigoFIFA} temporada ${season} no disponible en tu plan; la salto.`,
          );
          continue;
        }
        throw err;
      }
      for (const fx of json.response ?? []) {
        if (!FINISHED.has(fx.fixture?.status?.short)) continue;
        const gh = fx.goals?.home;
        const ga = fx.goals?.away;
        if (gh == null || ga == null) continue;
        const id = `af${fx.fixture.id}`;
        if (matchesById.has(id)) continue; // dedupe (aparece en ambos equipos)
        const homeId = ensureOpponent(fx.teams.home);
        const awayId = ensureOpponent(fx.teams.away);
        matchesById.set(id, {
          id,
          fecha: String(fx.fixture.date).slice(0, 10),
          competicion: traducirLiga(fx.league?.name ?? "Partido"),
          local: { teamId: homeId, goles: gh },
          visitante: { teamId: awayId, goles: ga },
        });
      }
    }
  }

  const matches = [...matchesById.values()].sort((a, b) =>
    a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0,
  );

  // 4) Fixture del Mundial: se arma con los grupos reales (fechas/sedes
  //    indicativas). La parte "real" que nos importaba era el historial.
  const fixtures = buildFixtures(teams.filter((t) => t.qualified), teamsById);

  return {
    meta: {
      version: "0.1.0",
      generadoEl: new Date().toISOString(),
      fuente: "api-football",
      ventanaAniosStats: STATS_WINDOW_YEARS,
      notas:
        `Historial real vía API-Football (${matches.length} partidos, temporadas ` +
        `${API_FOOTBALL_SEASONS.join("/")}). Fechas/sedes del fixture indicativas.`,
    },
    teams,
    matches,
    fixtures,
  };
}

// ----------------------- open data (martj42/results) -------------------------
//
// Fuente REAL, gratuita y sin API key: el dataset abierto
// "International football results from 1872 to present"
// (github.com/martj42/international_results). Trae TODOS los partidos de
// selecciones (amistosos, eliminatorias, copas, mundiales) en un CSV, y además
// incluye el fixture real del Mundial 2026 (con fecha y sede). Se clona por git
// (canal disponible incluso con egreso HTTP restringido) y se cachea.

const OPEN_DATA_REPO = "https://github.com/martj42/international_results.git";
// Ventana de historia incluida. Más atrás = H2H más completo pero snapshot más
// grande (1990 ≈ 2.3MB, 2002 ≈ 1.6MB, 2010 ≈ 1.1MB). 2002 equilibra H2H real y
// peso para mobile, sin pasarse del presupuesto (<2-3MB).
const OPEN_DATA_SINCE = process.env.OPEN_DATA_SINCE ?? "2002-01-01";

// Nombre del CSV -> id FIFA de las 48 clasificadas. Grafías tomadas del propio
// dataset (filas "FIFA World Cup" de 2026).
const OPEN_NAME_TO_ID: Record<string, string> = {
  Algeria: "alg", Argentina: "arg", Australia: "aus", Austria: "aut",
  Belgium: "bel", "Bosnia and Herzegovina": "bih", Brazil: "bra", Canada: "can",
  "Cape Verde": "cpv", Colombia: "col", Croatia: "cro", "Curaçao": "cuw",
  "Czech Republic": "cze", "DR Congo": "cod", Ecuador: "ecu", Egypt: "egy",
  England: "eng", France: "fra", Germany: "ger", Ghana: "gha", Haiti: "hai",
  Iran: "irn", Iraq: "irq", "Ivory Coast": "civ", Japan: "jpn", Jordan: "jor",
  Mexico: "mex", Morocco: "mar", Netherlands: "ned", "New Zealand": "nzl",
  Norway: "nor", Panama: "pan", Paraguay: "par", Portugal: "por", Qatar: "qat",
  "Saudi Arabia": "ksa", Scotland: "sco", Senegal: "sen", "South Africa": "rsa",
  "South Korea": "kor", Spain: "esp", Sweden: "swe", Switzerland: "sui",
  Tunisia: "tun", Turkey: "tur", "United States": "usa", Uruguay: "uru",
  Uzbekistan: "uzb",
};

// Traducción de competiciones del CSV (en inglés) al español.
function traducirTorneo(t: string): string {
  const n = t.toLowerCase();
  if (n === "friendly") return "Amistoso";
  if (n.includes("fifa world cup qualification")) return "Eliminatorias Mundial";
  if (n.includes("fifa world cup")) return "Copa del Mundo";
  if (n.includes("uefa nations league")) return "UEFA Nations League";
  if (n.includes("uefa euro qualification")) return "Eliminatorias Eurocopa";
  if (n.includes("uefa euro")) return "Eurocopa";
  if (n.includes("copa américa") || n.includes("copa america")) return "Copa América";
  if (n.includes("gold cup")) return "Copa Oro";
  if (n.includes("african cup") || n.includes("africa cup")) return "Copa Africana de Naciones";
  if (n.includes("afc asian cup")) return "Copa Asiática";
  if (n.includes("concacaf nations league")) return "Liga de Naciones CONCACAF";
  if (n.includes("finalissima")) return "Finalissima";
  return t;
}

/** Devuelve el path al results.csv, clonando/actualizando el repo si hace falta. */
function ensureOpenDataCsv(): string {
  if (process.env.OPEN_DATA_CSV) return resolve(process.env.OPEN_DATA_CSV);
  mkdirSync(CACHE_DIR, { recursive: true });
  const dir = resolve(CACHE_DIR, "international_results");
  const csv = resolve(dir, "results.csv");
  if (existsSync(csv)) {
    try {
      execFileSync("git", ["-C", dir, "pull", "--depth", "1", "--quiet"], { stdio: "ignore" });
    } catch {
      /* si falla el pull, usamos lo cacheado */
    }
  } else {
    console.log(`[build-dataset] Clonando dataset abierto (${OPEN_DATA_REPO})…`);
    execFileSync("git", ["clone", "--depth", "1", OPEN_DATA_REPO, dir], { stdio: "inherit" });
  }
  return csv;
}

/** Parser CSV mínimo (este dataset no usa comas embebidas ni comillas). */
function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","));
}

function buildFromOpenData(): Dataset {
  const csvPath = ensureOpenDataCsv();
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const header = rows.shift()!;
  const col = (name: string) => header.indexOf(name);
  const iDate = col("date"), iHome = col("home_team"), iAway = col("away_team"),
    iHS = col("home_score"), iAS = col("away_score"), iTour = col("tournament"),
    iCity = col("city");

  const teams: Team[] = TEAMS.map((t) => ({ ...t, qualified: true }));
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const nameToId = new Map(Object.entries(OPEN_NAME_TO_ID));

  function teamIdFor(nombre: string): string {
    const known = nameToId.get(nombre);
    if (known) return known;
    const synthId = "od-" + nombre.toLowerCase().replace(/[^a-z]+/g, "-");
    if (!teamsById.has(synthId)) {
      const opp: Team = {
        id: synthId,
        nombre,
        codigoFIFA: nombre.slice(0, 3).toUpperCase(),
        confederacion: "UEFA", // desconocida; no se usa para no clasificados
        grupo: null,
        bandera: "🏳️",
        rankingFIFA: 0,
        qualified: false,
      };
      teams.push(opp);
      teamsById.set(synthId, opp);
      nameToId.set(nombre, synthId);
    }
    return synthId;
  }

  const matches: Match[] = [];
  const fixtures: Fixture2026[] = [];
  let matchSeq = 0;
  let fixtureSeq = 0;

  for (const r of rows) {
    const fecha = r[iDate];
    const homeName = r[iHome];
    const awayName = r[iAway];
    const homeIn48 = OPEN_NAME_TO_ID[homeName];
    const awayIn48 = OPEN_NAME_TO_ID[awayName];

    // Fixture real del Mundial 2026 (fase de grupos: 11–27 jun, ambos clasificados).
    const esWC2026 =
      r[iTour] === "FIFA World Cup" && fecha >= "2026-06-11" && fecha <= "2026-06-27";
    if (esWC2026 && homeIn48 && awayIn48) {
      const grupo = teamsById.get(homeIn48)!.grupo;
      fixtures.push({
        id: `wc2026-${++fixtureSeq}`,
        grupo: grupo ?? "A",
        fecha,
        sede: r[iCity] || "Por confirmar",
        teamAId: homeIn48,
        teamBId: awayIn48,
        fase: "grupos",
        numeroPartido: fixtureSeq,
      });
      continue;
    }

    // Partidos históricos: con resultado, dentro de la ventana, que involucren
    // al menos una de las 48.
    const hs = Number(r[iHS]);
    const as = Number(r[iAS]);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    if (fecha < OPEN_DATA_SINCE) continue;
    if (fecha > "2026-06-10") continue; // nada posterior al "hoy" del snapshot
    if (!homeIn48 && !awayIn48) continue;

    matches.push({
      id: `od${++matchSeq}`,
      fecha,
      competicion: traducirTorneo(r[iTour]),
      local: { teamId: teamIdFor(homeName), goles: hs },
      visitante: { teamId: teamIdFor(awayName), goles: as },
    });
  }

  matches.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  fixtures.sort((a, b) =>
    a.fecha === b.fecha ? a.numeroPartido - b.numeroPartido : a.fecha < b.fecha ? -1 : 1,
  );
  fixtures.forEach((f, i) => (f.numeroPartido = i + 1));

  return {
    meta: {
      version: "0.1.0",
      generadoEl: new Date().toISOString(),
      fuente: "open-data",
      ventanaAniosStats: STATS_WINDOW_YEARS,
      notas:
        `Datos REALES del dataset abierto martj42/international_results ` +
        `(${matches.length} partidos desde ${OPEN_DATA_SINCE}; fixture WC2026 real).`,
    },
    teams,
    matches,
    fixtures,
  };
}

// --------------------------------- main --------------------------------------

async function main() {
  const source =
    process.env.DATA_SOURCE ??
    (process.env.API_FOOTBALL_KEY ? "api-football" : "open-data");
  let dataset: Dataset;

  if (source === "simulated" || source === "simulado") {
    console.log("[build-dataset] Generando snapshot SIMULADO determinista.");
    dataset = buildSimulated();
  } else if (source === "api-football") {
    console.log("[build-dataset] Usando API-Football (datos reales).");
    dataset = await buildFromApiFootball(process.env.API_FOOTBALL_KEY!);
  } else {
    console.log("[build-dataset] Usando dataset abierto martj42 (datos reales, sin API key).");
    dataset = buildFromOpenData();
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

const isCli =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
