import { describe, expect, it } from "vitest";
import { headToHead, perspectiva, teamStats4Y } from "./derive";
import type { Match } from "../types";

const m = (
  id: string,
  fecha: string,
  l: string,
  lg: number,
  v: string,
  vg: number,
): Match => ({
  id,
  fecha,
  competicion: "Amistoso",
  local: { teamId: l, goles: lg },
  visitante: { teamId: v, goles: vg },
});

describe("perspectiva", () => {
  it("calcula resultado desde la perspectiva del equipo (local y visitante)", () => {
    const match = m("1", "2025-01-01", "arg", 2, "bra", 1);
    const pa = perspectiva(match, "arg");
    expect(pa.resultado).toBe("G");
    expect(pa.golesFavor).toBe(2);
    expect(pa.esLocal).toBe(true);

    const pb = perspectiva(match, "bra");
    expect(pb.resultado).toBe("P");
    expect(pb.golesFavor).toBe(1);
    expect(pb.esLocal).toBe(false);
  });
});

describe("teamStats4Y", () => {
  it("agrega solo los partidos dentro de la ventana", () => {
    const matches = [
      m("1", "2025-06-01", "arg", 2, "bra", 0), // G
      m("2", "2024-06-01", "uru", 1, "arg", 1), // E
      m("3", "2023-06-01", "arg", 0, "chi", 2), // P
      m("4", "2018-06-01", "arg", 5, "per", 0), // fuera de ventana
    ];
    const stats = teamStats4Y(matches, "arg", 4, new Date("2026-01-01"));
    expect(stats.pj).toBe(3);
    expect(stats.pg).toBe(1);
    expect(stats.pe).toBe(1);
    expect(stats.pp).toBe(1);
    expect(stats.golesFavor).toBe(3); // 2 + 1 + 0
    expect(stats.golesContra).toBe(3); // 0 + 1 + 2
  });
});

describe("headToHead", () => {
  it("resume los cruces desde la perspectiva del equipo A", () => {
    const matchesA = [
      m("1", "2025-06-01", "arg", 3, "bra", 1), // G
      m("2", "2024-06-01", "bra", 2, "arg", 0), // P
      m("3", "2023-06-01", "arg", 1, "bra", 1), // E
      m("4", "2022-06-01", "arg", 1, "uru", 0), // no es vs bra
    ];
    const h = headToHead(matchesA, "arg", "bra");
    expect(h.resumen.totalPJ).toBe(3);
    expect(h.resumen.ganadosA).toBe(1);
    expect(h.resumen.empates).toBe(1);
    expect(h.resumen.ganadosB).toBe(1);
    expect(h.resumen.golesA).toBe(4); // 3 + 0 + 1
    expect(h.resumen.golesB).toBe(4); // 1 + 2 + 1
  });
});
