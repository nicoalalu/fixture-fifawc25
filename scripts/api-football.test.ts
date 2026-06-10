// Verifica el camino de datos REALES (buildFromApiFootball) contra respuestas
// mockeadas de API-Football, sin red. Cubre: resolución de id por búsqueda,
// parseo de fixtures, filtro de partidos terminados, dedupe y alta de rivales
// no clasificados.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { validateDataset } from "./validate-dataset.ts";

const cacheDir = mkdtempSync(resolve(tmpdir(), "aff-cache-"));
process.env.API_FOOTBALL_CACHE_DIR = cacheDir;
process.env.API_FOOTBALL_DELAY_MS = "0";

// Importar DESPUÉS de fijar las env vars (CACHE_DIR se lee al cargar el módulo).
const { buildFromApiFootball, apiGet } = await import("./build-dataset.ts");

let apiSeq = 1000;

function mockTeam(name: string) {
  return { team: { id: apiSeq++, name, national: true, logo: `https://logo/${name}.png` } };
}

// Asigna un id de API determinista por nombre buscado.
const idByName = new Map<string, number>();
function idFor(name: string): number {
  if (!idByName.has(name)) idByName.set(name, apiSeq++);
  return idByName.get(name)!;
}

function fixture(id: number, home: any, away: any, gh: number | null, ga: number | null, status = "FT", league = "Friendlies") {
  return {
    fixture: { id, date: `2025-0${(id % 9) + 1}-15T18:00:00+00:00`, status: { short: status } },
    league: { name: league },
    teams: { home, away },
    goals: { home: gh, away: ga },
  };
}

beforeAll(() => {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = new URL(url);
    const path = u.pathname;
    let body: any;

    if (path === "/status") {
      body = { errors: [], response: { account: { email: "test@test" }, requests: { current: 1, limit_day: 100 } } };
    } else if (path === "/teams") {
      const search = u.searchParams.get("search")!;
      body = { errors: [], response: [{ team: { id: idFor(search), name: search, national: true, logo: `https://logo/${search}.png` } }] };
    } else if (path === "/fixtures") {
      const teamId = Number(u.searchParams.get("team"));
      // Un equipo "ancla" (el primer id asignado) juega: una victoria, un
      // empate, una derrota, un partido NO terminado (debe descartarse) y un
      // partido contra un rival NO clasificado (Bolivia).
      const anchor = idFor("Argentina");
      const opp = idFor("Uruguay");
      const noQual = { id: 99999, name: "Bolivia", logo: "https://logo/Bolivia.png" };
      const home = { id: teamId, name: "Equipo", logo: "x" };
      const list =
        teamId === anchor
          ? [
              fixture(1, { id: anchor, name: "Argentina" }, { id: opp, name: "Uruguay" }, 2, 0),
              fixture(2, { id: opp, name: "Uruguay" }, { id: anchor, name: "Argentina" }, 1, 1),
              fixture(3, { id: anchor, name: "Argentina" }, noQual, 0, 1),
              fixture(4, { id: anchor, name: "Argentina" }, { id: opp, name: "Uruguay" }, 0, 0, "NS"),
            ]
          : [fixture(1000 + teamId, home, { id: 88888 + teamId, name: "RivalX", logo: "y" }, 1, 0)];
      body = { errors: [], response: list };
    } else {
      throw new Error("URL no mockeada: " + path);
    }
    return { ok: true, status: 200, statusText: "OK", json: async () => body };
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
  rmSync(cacheDir, { recursive: true, force: true });
});

describe("buildFromApiFootball (mock)", () => {
  it("arma un dataset válido con 48 clasificadas + rivales históricos", async () => {
    const ds = await buildFromApiFootball("FAKE_KEY");

    expect(ds.meta.fuente).toBe("api-football");
    expect(ds.teams.filter((t) => t.qualified).length).toBe(48);
    // Aparecen rivales no clasificados (Bolivia + los RivalX).
    expect(ds.teams.some((t) => !t.qualified)).toBe(true);
    expect(ds.fixtures.length).toBe(72);
    expect(validateDataset(ds)).toEqual([]);
  });

  it("descarta partidos no terminados y deduplica los compartidos", async () => {
    const ds = await buildFromApiFootball("FAKE_KEY");
    // El partido NS (id 4) no debe estar; el 1 y 2 (compartidos ARG/URU) una sola vez.
    const ids = ds.matches.map((m) => m.id);
    expect(ids).toContain("af1");
    expect(ids).toContain("af2");
    expect(ids).not.toContain("af4");
    expect(new Set(ids).size).toBe(ids.length); // sin duplicados
  });

  it("convierte el logo en bandera para rivales sin emoji", async () => {
    const ds = await buildFromApiFootball("FAKE_KEY");
    const bolivia = ds.teams.find((t) => t.nombre === "Bolivia");
    expect(bolivia).toBeTruthy();
    expect(bolivia!.qualified).toBe(false);
    expect(bolivia!.bandera).toMatch(/^https?:\/\//);
  });

  it("reintenta ante un 429 y termina resolviendo", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      if (calls < 3) {
        return { ok: false, status: 429, statusText: "Too Many Requests", headers: { get: () => null } };
      }
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ errors: [], response: [{ ok: true }] }) };
    });
    const json = await apiGet("FAKE_KEY", "/status", {}, "retry-test");
    expect(calls).toBe(3); // dos 429 + un 200
    expect(json.response[0].ok).toBe(true);
  });
});
