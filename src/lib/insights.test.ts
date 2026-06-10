import { describe, expect, it } from "vitest";
import { buildInsight } from "./insights";
import type { HeadToHead, MatchPerspectiva, Resultado } from "../types";

const N = { a: "Argentina", b: "Brasil" };

function persp(resultado: Resultado, gf: number, gc: number, fecha: string): MatchPerspectiva {
  return {
    match: {
      id: "x" + fecha,
      fecha,
      competicion: "Amistoso",
      local: { teamId: "arg", goles: gf },
      visitante: { teamId: "bra", goles: gc },
    },
    resultado,
    golesFavor: gf,
    golesContra: gc,
    rivalId: "bra",
    esLocal: true,
  };
}

function h2hFrom(persps: MatchPerspectiva[]): HeadToHead {
  let ga = 0, e = 0, gb = 0, golesA = 0, golesB = 0;
  for (const p of persps) {
    if (p.resultado === "G") ga++;
    else if (p.resultado === "E") e++;
    else gb++;
    golesA += p.golesFavor;
    golesB += p.golesContra;
  }
  return {
    teamAId: "arg",
    teamBId: "bra",
    enfrentamientos: persps,
    resumen: {
      totalPJ: persps.length,
      ganadosA: ga,
      empates: e,
      ganadosB: gb,
      golesA,
      golesB,
      ultimoCruce: persps[0]?.match ?? null,
    },
  };
}

describe("buildInsight", () => {
  it("detecta cruce inédito sin historia", () => {
    const i = buildInsight(h2hFrom([]), N);
    expect(i.tono).toBe("sin-historia");
    expect(i.regla).toBe("sin-historia");
  });

  it("detecta dominancia clara", () => {
    const persps = [
      persp("G", 2, 0, "2025-01-01"),
      persp("G", 1, 0, "2024-01-01"),
      persp("G", 3, 1, "2023-01-01"),
      persp("E", 1, 1, "2022-01-01"),
      persp("G", 2, 1, "2021-01-01"),
    ];
    const i = buildInsight(h2hFrom(persps), N);
    expect(i.regla).toBe("dominancia");
    expect(i.tono).toBe("favorable");
  });

  it("detecta tendencia reciente contraria al historial", () => {
    // A domina global (4-0-2) pero perdió los últimos 2.
    const persps = [
      persp("P", 0, 1, "2025-06-01"),
      persp("P", 1, 2, "2025-01-01"),
      persp("G", 2, 0, "2024-01-01"),
      persp("G", 1, 0, "2023-01-01"),
      persp("G", 2, 1, "2022-01-01"),
      persp("G", 3, 0, "2021-01-01"),
    ];
    const i = buildInsight(h2hFrom(persps), N);
    expect(i.regla).toBe("tendencia-contraria");
  });

  it("detecta partidos de muchos goles", () => {
    const persps = [
      persp("E", 2, 2, "2025-01-01"),
      persp("G", 3, 2, "2024-01-01"),
      persp("P", 2, 3, "2023-01-01"),
      persp("E", 3, 3, "2022-01-01"),
    ];
    const i = buildInsight(h2hFrom(persps), N);
    expect(i.regla).toBe("goles");
    expect(i.tono).toBe("goleador");
  });

  it("cae en paridad cuando no aplica otra regla", () => {
    const persps = [
      persp("G", 1, 0, "2025-01-01"),
      persp("P", 0, 1, "2024-01-01"),
      persp("E", 0, 0, "2023-01-01"),
    ];
    const i = buildInsight(h2hFrom(persps), N);
    expect(i.regla).toBe("paridad");
    expect(i.tono).toBe("parejo");
  });
});
